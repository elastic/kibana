/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type {
  AnalyticsServiceStart,
  FeatureFlagsStart,
  HttpServiceStart,
  IClusterClient,
  SecurityServiceStart,
  UserProfileServiceStart,
} from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

/**
 * The slice of Core a workflow run reads. It is a subset of `CoreStart`, so Kibana hands over its
 * `coreStart` as is, and a task process builds it from its host without a `CoreStart`.
 */
export interface WorkflowCoreStart {
  elasticsearch: { client: Pick<IClusterClient, 'asInternalUser' | 'asScoped'> };
  /** Reads the user of a request and checks and binds the workflow service accounts. */
  security: Pick<SecurityServiceStart, 'authc' | 'audit' | 'serviceAccounts'>;
  userProfile: Pick<UserProfileServiceStart, 'getCurrentProfileId'>;
  /** `callKibanaApi`, `kibana.*` steps and links: the self client and the address of Kibana. */
  http: Pick<HttpServiceStart, 'basePath' | 'selfClient' | 'getServerInfo'> & {
    /**
     * A task process only: where the process reaches Kibana (Core's self client calls it). Then
     * `basePath.publicBaseUrl` is Kibana's own public base URL, which links are built from.
     */
    kibanaUrl?: string;
  };
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  /** The logs and trigger events data streams (see {@link WorkflowDataStreamsAdapter}). */
  dataStreams: WorkflowDataStreamsAdapter;
  featureFlags: Pick<FeatureFlagsStart, 'getBooleanValue$'>;
}

/**
 * How the engine gets the client of one of its data streams: Core's `dataStreams` in Kibana, clients
 * built from the shared definitions (`getWorkflowDataStreamDefinitions`) in a task process.
 */
export type WorkflowDataStreamsAdapter = Pick<DataStreamsStart, 'initializeClient'>;

/** The Task Manager surface the engine uses: Kibana hands over its start contract, a process its host's. */
export type WorkflowRuntimeTaskManager = Pick<
  TaskManagerStartContract,
  | 'schedule'
  | 'bulkSchedule'
  | 'get'
  | 'fetch'
  | 'bulkGet'
  | 'runSoon'
  | 'ensureScheduled'
  | 'removeIfExists'
  | 'bulkRemove'
> &
  /**
   * Bundle manifests live in Main's supervisor, so only Kibana's real start contract has this; a
   * task process's host does not, and schedules a sub-workflow without resolving its packs there.
   */
  Partial<Pick<TaskManagerStartContract, 'getTaskBundlePacks'>>;

/** The cloud fields the engine reads: the link to Kibana and what metering is keyed by. */
export type WorkflowCloudInfo = Pick<
  CloudSetup,
  'kibanaUrl' | 'serverless' | 'deploymentId' | 'csp' | 'region' | 'elasticsearchClusterId'
>;
