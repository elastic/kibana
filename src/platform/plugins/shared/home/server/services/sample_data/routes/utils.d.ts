/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext, Logger } from '@kbn/core/server';
import type { SampleDatasetSchema } from '../lib/sample_dataset_registry_types';
import type { SampleDataInstaller } from '../sample_data_installer';
export declare const SAMPLE_DATA_INSTALLED_EVENT = 'sample_data_installed';
export declare const SAMPLE_DATA_UNINSTALLED_EVENT = 'sample_data_uninstalled';
export declare const getSampleDataInstaller: ({
  datasetId,
  context,
  sampleDatasets,
  logger,
}: {
  datasetId: string;
  context: RequestHandlerContext;
  sampleDatasets: SampleDatasetSchema[];
  logger: Logger;
}) => Promise<SampleDataInstaller>;
export declare const getSavedObjectsClient: (
  context: RequestHandlerContext,
  objectTypes: string[]
) => Promise<import('@kbn/core/server').SavedObjectsClientContract>;
