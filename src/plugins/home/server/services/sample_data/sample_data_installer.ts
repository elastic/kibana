/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { isBoom } from '@hapi/boom';
import type {
  IScopedClusterClient,
  ISavedObjectsImporter,
  Logger,
  SavedObjectsClientContract,
} from 'src/core/server';
import type { SampleDatasetSchema, DataIndexSchema } from './lib/sample_dataset_registry_types';
import { dateToIso8601IgnoringTime } from './lib/translate_timestamp';
import { createIndexName } from './lib/create_index_name';
import { insertDataIntoIndex } from './lib/insert_data_into_index';
import { SampleDataInstallError } from './errors';
import { findSampleObjects } from './lib/find_sample_objects';

export interface SampleDataInstallerOptions {
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  soImporter: ISavedObjectsImporter;
  sampleDatasets: SampleDatasetSchema[];
  logger: Logger;
}

export interface SampleDataInstallResult {
  createdDocsPerIndex: Record<string, number>;
  createdSavedObjects: number;
}

export class SampleDataInstaller {
  private readonly esClient: IScopedClusterClient;
  private readonly soClient: SavedObjectsClientContract;
  private readonly soImporter: ISavedObjectsImporter;
  private readonly sampleDatasets: SampleDatasetSchema[];
  private readonly logger: Logger;

  constructor({
    esClient,
    soImporter,
    soClient,
    sampleDatasets,
    logger,
  }: SampleDataInstallerOptions) {
    this.esClient = esClient;
    this.soClient = soClient;
    this.soImporter = soImporter;
    this.sampleDatasets = sampleDatasets;
    this.logger = logger;
  }

  async install(
    datasetId: string,
    installDate: Date = new Date()
  ): Promise<SampleDataInstallResult> {
    const sampleDataset = this.sampleDatasets.find(({ id }) => id === datasetId);
    if (!sampleDataset) {
      throw new SampleDataInstallError(`Sample dataset ${datasetId} not found`, 404);
    }

    const nowReference = dateToIso8601IgnoringTime(installDate);
    const createdDocsPerIndex: Record<string, number> = {};

    for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
      const dataIndex = sampleDataset.dataIndices[i];
      // clean up any old installation of dataset
      await this.uninstallDataIndex(sampleDataset, dataIndex);
      await this.installDataIndex(sampleDataset, dataIndex);

      const injectedCount = await insertDataIntoIndex({
        index: createIndexName(sampleDataset.id, dataIndex.id),
        nowReference,
        logger: this.logger,
        esClient: this.esClient,
        dataIndexConfig: dataIndex,
      });
      createdDocsPerIndex[dataIndex.id] = injectedCount;
    }

    const createdSavedObjects = await this.importSavedObjects(sampleDataset);

    return {
      createdDocsPerIndex,
      createdSavedObjects,
    };
  }

  async uninstall(datasetId: string) {
    const sampleDataset = this.sampleDatasets.find(({ id }) => id === datasetId);
    if (!sampleDataset) {
      throw new SampleDataInstallError(`Sample dataset ${datasetId} not found`, 404);
    }

    // TODO
    for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
      const dataIndex = sampleDataset.dataIndices[i];
      await this.uninstallDataIndex(sampleDataset, dataIndex);
    }
    await this.deleteSavedObjects(sampleDataset);
  }

  private async uninstallDataIndex(dataset: SampleDatasetSchema, dataIndex: DataIndexSchema) {
    const index = createIndexName(dataset.id, dataIndex.id);
    try {
      await this.esClient.asCurrentUser.indices.delete({
        index,
      });
    } catch (err) {
      // ignore delete errors
    }
  }

  private async installDataIndex(dataset: SampleDatasetSchema, dataIndex: DataIndexSchema) {
    const index = createIndexName(dataset.id, dataIndex.id);
    try {
      await this.esClient.asCurrentUser.indices.create({
        index,
        body: {
          settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
          mappings: { properties: dataIndex.fields },
        },
      });
    } catch (err) {
      const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
      this.logger.warn(errMsg);
      throw new SampleDataInstallError(errMsg, err.status);
    }
  }

  private async importSavedObjects(dataset: SampleDatasetSchema) {
    const savedObjects = dataset.savedObjects.map(({ version, ...obj }) => obj);
    const readStream = Readable.from(savedObjects);

    const { errors = [] } = await this.soImporter.import({
      readStream,
      overwrite: true,
      createNewCopies: false,
    });
    if (errors.length > 0) {
      const errMsg = `sample_data install errors while loading saved objects. Errors: ${JSON.stringify(
        errors.map(({ type, id, error }) => ({ type, id, error })) // discard other fields
      )}`;
      this.logger.warn(errMsg);
      throw new SampleDataInstallError(errMsg, 500);
    }
    return savedObjects.length;
  }

  private async deleteSavedObjects(dataset: SampleDatasetSchema) {
    const objects = dataset.savedObjects.map(({ type, id }) => ({ type, id }));
    const findSampleObjectsResult = await findSampleObjects({
      client: this.soClient,
      logger: this.logger,
      objects,
    });
    const objectsToDelete = findSampleObjectsResult.filter(({ foundObjectId }) => foundObjectId);
    const deletePromises = objectsToDelete.map(({ type, foundObjectId }) =>
      this.soClient.delete(type, foundObjectId!).catch((err) => {
        // if the object doesn't exist, ignore the error and proceed
        if (isBoom(err) && err.output.statusCode === 404) {
          return;
        }
        throw err;
      })
    );
    try {
      await Promise.all(deletePromises);
    } catch (err) {
      throw new SampleDataInstallError(
        `Unable to delete sample dataset saved objects, error: ${err.body.error.type}`,
        err.body.status
      );
    }
  }
}
