/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SampleDatasetSchema } from './sample_dataset_schema';
export type { SampleDatasetSchema, DataIndexSchema } from './sample_dataset_schema';

export enum DatasetStatusTypes {
  NOT_INSTALLED = 'not_installed',
  INSTALLED = 'installed',
  UNKNOWN = 'unknown',
}
export interface SampleDatasetDashboardPanel {
  sampleDataId: string;
  dashboardId: string;
  oldEmbeddableId: string;
  embeddableId: string;
  embeddableType: EmbeddableTypes;
  embeddableConfig: object;
}
export enum EmbeddableTypes {
  MAP_SAVED_OBJECT_TYPE = 'map',
  SEARCH_EMBEDDABLE_TYPE = 'search',
  VISUALIZE_EMBEDDABLE_TYPE = 'visualization',
}
export type SampleDatasetProvider = () => SampleDatasetSchema;

/** This type is used to identify an object in a sample dataset. */
export interface SampleObject {
  /** The type of the sample object. */
  type: string;
  /** The ID of the sample object. */
  id: string;
}

/**
 * This type is used by consumers to register a new app link for a sample dataset.
 */
export interface AppLinkData {
  /**
   * The sample object that is used for this app link's path; if the path does not use an object ID, set this to null.
   */
  sampleObject: SampleObject | null;
  /**
   * Function that returns the path for this app link. Note that the `objectId` can be different than the given `sampleObject.id`, depending
   * on how the sample data was installed. If the `sampleObject` is null, the `objectId` argument will be an empty string.
   */
  getPath: (objectId: string) => string;
  /**
   * The label for this app link.
   */
  label: string;
  /**
   * The icon for this app link.
   */
  icon: string;
}
