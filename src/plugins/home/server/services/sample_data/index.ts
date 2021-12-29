/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { SampleDataRegistry } from './sample_data_registry';

export type { SampleDataRegistrySetup, SampleDataRegistryStart } from './sample_data_registry';

export { EmbeddableTypes } from './lib/sample_dataset_registry_types';

export type {
  AppLinkData,
  SampleDatasetDashboardPanel,
  SampleDatasetProvider,
  SampleDatasetSchema,
  SampleObject,
} from './lib/sample_dataset_registry_types';
