/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';
import { LogsExplorerNavigationParams } from './logs_explorer';

// Will become a union once we have more origins
export interface ObservabilityLogsExplorerLocationState extends SerializableRecord {
  origin?: {
    id: 'application-log-onboarding';
  };
}

export type DatasetLocatorParams = LogsExplorerNavigationParams &
  ObservabilityLogsExplorerLocationState;

// All datasets locator
export const ALL_DATASETS_LOCATOR_ID = 'ALL_DATASETS_LOCATOR';

export type AllDatasetsLocatorParams = DatasetLocatorParams;

// Single dataset locator
export const SINGLE_DATASET_LOCATOR_ID = 'SINGLE_DATASET_LOCATOR';

export interface SingleDatasetLocatorParams extends DatasetLocatorParams {
  /**
   * Integration name to be selected.
   */
  integration?: string;
  /**
   * Dataset name to be selected.
   * ex: system.syslog
   */
  dataset: string;
}

// Data view locator
export const OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR_ID = 'OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR';

export interface ObsLogsExplorerDataViewLocatorParams extends DatasetLocatorParams {
  /**
   * Data view id to select
   */
  id: string;
}
