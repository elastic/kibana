/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IScopedClusterClient,
  ISavedObjectsImporter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SampleDatasetSchema } from './lib/sample_dataset_registry_types';
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
/**
 * Utility class in charge of installing and uninstalling sample datasets
 */
export declare class SampleDataInstaller {
  private readonly esClient;
  private readonly soClient;
  private readonly soImporter;
  private readonly sampleDatasets;
  private readonly logger;
  constructor({
    esClient,
    soImporter,
    soClient,
    sampleDatasets,
    logger,
  }: SampleDataInstallerOptions);
  install(datasetId: string, installDate?: Date): Promise<SampleDataInstallResult>;
  uninstall(datasetId: string): Promise<{
    deletedSavedObjects: number;
  }>;
  private uninstallDataIndex;
  private installDataIndex;
  private importSavedObjects;
  private deleteSavedObjects;
}
