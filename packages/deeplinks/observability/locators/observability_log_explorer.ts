/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { LogExplorerNavigationParams } from './log_explorer';

// Will become a union once we have more origins
export interface ObservabilityLogExplorerLocationState extends SerializableRecord {
  origin?: {
    id: 'application-log-onboarding';
  };
}

export type DatasetLocatorParams = LogExplorerNavigationParams &
  ObservabilityLogExplorerLocationState;

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

export const TRACE_LOGS_LOCATOR_ID = 'TRACE_LOGS_LOCATOR';

export interface TraceLogsLocatorParams extends SerializableRecord {
  traceId: string;
  time?: number;
}

export const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

type NodeType = 'host' | 'pod' | 'container' | 'awsEC2' | 'awsS3' | 'awsSQS' | 'awsRDS';

export interface NodeLogsLocatorParams extends SerializableRecord {
  nodeId: string;
  nodeType: NodeType;
  time?: number;
}
