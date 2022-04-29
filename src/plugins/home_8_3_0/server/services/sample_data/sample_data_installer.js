/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.SampleDataInstaller = void 0;

const _defineProperty2 = _interopRequireDefault(require('@babel/runtime/helpers/defineProperty'));

const _stream = require('stream');

const _boom = require('@hapi/boom');

const _translate_timestamp = require('./lib/translate_timestamp');

const _create_index_name = require('./lib/create_index_name');

const _insert_data_into_index = require('./lib/insert_data_into_index');

const _errors = require('./errors');

const _find_sample_objects = require('./lib/find_sample_objects');

/**
 * Utility class in charge of installing and uninstalling sample datasets
 */
class SampleDataInstaller {
  constructor({ esClient, soImporter, soClient, sampleDatasets, logger }) {
    (0, _defineProperty2.default)(this, 'esClient', void 0);
    (0, _defineProperty2.default)(this, 'soClient', void 0);
    (0, _defineProperty2.default)(this, 'soImporter', void 0);
    (0, _defineProperty2.default)(this, 'sampleDatasets', void 0);
    (0, _defineProperty2.default)(this, 'logger', void 0);
    this.esClient = esClient;
    this.soClient = soClient;
    this.soImporter = soImporter;
    this.sampleDatasets = sampleDatasets;
    this.logger = logger;
  }

  async install(datasetId, installDate = new Date()) {
    const sampleDataset = this.sampleDatasets.find(({ id }) => id === datasetId);

    if (!sampleDataset) {
      throw new _errors.SampleDataInstallError(`Sample dataset ${datasetId} not found`, 404);
    }

    const nowReference = (0, _translate_timestamp.dateToIso8601IgnoringTime)(installDate);
    const createdDocsPerIndex = {};

    for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
      const dataIndex = sampleDataset.dataIndices[i];
      const indexName = (0, _create_index_name.createIndexName)(sampleDataset.id, dataIndex.id); // clean up any old installation of dataset

      await this.uninstallDataIndex(sampleDataset, dataIndex);
      await this.installDataIndex(sampleDataset, dataIndex);
      const injectedCount = await (0, _insert_data_into_index.insertDataIntoIndex)({
        index: indexName,
        nowReference,
        logger: this.logger,
        esClient: this.esClient,
        dataIndexConfig: dataIndex,
      });
      createdDocsPerIndex[indexName] = injectedCount;
    }

    const createdSavedObjects = await this.importSavedObjects(sampleDataset);
    return {
      createdDocsPerIndex,
      createdSavedObjects,
    };
  }

  async uninstall(datasetId) {
    const sampleDataset = this.sampleDatasets.find(({ id }) => id === datasetId);

    if (!sampleDataset) {
      throw new _errors.SampleDataInstallError(`Sample dataset ${datasetId} not found`, 404);
    }

    for (let i = 0; i < sampleDataset.dataIndices.length; i++) {
      const dataIndex = sampleDataset.dataIndices[i];
      await this.uninstallDataIndex(sampleDataset, dataIndex);
    }

    const deletedObjects = await this.deleteSavedObjects(sampleDataset);
    return {
      deletedSavedObjects: deletedObjects,
    };
  }

  async uninstallDataIndex(dataset, dataIndex) {
    let index = (0, _create_index_name.createIndexName)(dataset.id, dataIndex.id);

    try {
      // if the sample data was reindexed using UA, the index name is actually an alias pointing to the reindexed
      // index. In that case, we need to get rid of the alias and to delete the underlying index
      const response = await this.esClient.asCurrentUser.indices.getAlias({
        name: index,
      });
      const aliasName = index;
      index = Object.keys(response)[0];
      await this.esClient.asCurrentUser.indices.deleteAlias({
        name: aliasName,
        index,
      });
    } catch (err) {
      // ignore errors from missing alias
    }

    try {
      await this.esClient.asCurrentUser.indices.delete({
        index,
      });
    } catch (err) {
      // ignore delete errors
    }
  }

  async installDataIndex(dataset, dataIndex) {
    const index = (0, _create_index_name.createIndexName)(dataset.id, dataIndex.id);

    try {
      await this.esClient.asCurrentUser.indices.create({
        index,
        body: {
          settings: {
            index: {
              number_of_shards: 1,
              auto_expand_replicas: '0-1',
            },
          },
          mappings: {
            properties: dataIndex.fields,
          },
        },
      });
    } catch (err) {
      const errMsg = `Unable to create sample data index "${index}", error: ${err.message}`;
      this.logger.warn(errMsg);
      throw new _errors.SampleDataInstallError(errMsg, err.status);
    }
  }

  async importSavedObjects(dataset) {
    const savedObjects = dataset.savedObjects.map(({ version, ...obj }) => obj);

    const readStream = _stream.Readable.from(savedObjects);

    const { errors = [] } = await this.soImporter.import({
      readStream,
      overwrite: true,
      createNewCopies: false,
    });

    if (errors.length > 0) {
      const errMsg = `sample_data install errors while loading saved objects. Errors: ${JSON.stringify(
        errors.map(({ type, id, error }) => ({
          type,
          id,
          error,
        })) // discard other fields
      )}`;
      this.logger.warn(errMsg);
      throw new _errors.SampleDataInstallError(errMsg, 500);
    }

    return savedObjects.length;
  }

  async deleteSavedObjects(dataset) {
    const objects = dataset.savedObjects.map(({ type, id }) => ({
      type,
      id,
    }));
    const findSampleObjectsResult = await (0, _find_sample_objects.findSampleObjects)({
      client: this.soClient,
      logger: this.logger,
      objects,
    });
    const objectsToDelete = findSampleObjectsResult.filter(({ foundObjectId }) => foundObjectId);
    const deletePromises = objectsToDelete.map(({ type, foundObjectId }) =>
      this.soClient.delete(type, foundObjectId).catch((err) => {
        // if the object doesn't exist, ignore the error and proceed
        if ((0, _boom.isBoom)(err) && err.output.statusCode === 404) {
          return;
        }

        throw err;
      })
    );

    try {
      await Promise.all(deletePromises);
    } catch (err) {
      let _err$body$error$type;
      let _err$body;
      let _err$body$error;
      let _err$body$status;
      let _err$body2;

      throw new _errors.SampleDataInstallError(
        `Unable to delete sample dataset saved objects, error: ${
          (_err$body$error$type =
            (_err$body = err.body) === null || _err$body === void 0
              ? void 0
              : (_err$body$error = _err$body.error) === null || _err$body$error === void 0
              ? void 0
              : _err$body$error.type) !== null && _err$body$error$type !== void 0
            ? _err$body$error$type
            : err.message
        }`,
        (_err$body$status =
          (_err$body2 = err.body) === null || _err$body2 === void 0
            ? void 0
            : _err$body2.status) !== null && _err$body$status !== void 0
          ? _err$body$status
          : 500
      );
    }

    return objectsToDelete.length;
  }
}

exports.SampleDataInstaller = SampleDataInstaller;
