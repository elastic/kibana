/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type { Mutable } from 'utility-types';
import type {
  SentinelOneBaseApiResponseSchema,
  SentinelOneConfigSchema,
  SentinelOneExecuteScriptParamsSchema,
  SentinelOneGetAgentsParamsSchema,
  SentinelOneGetAgentsResponseSchema,
  SentinelOneGetRemoteScriptsParamsSchema,
  SentinelOneGetRemoteScriptsResponseSchema,
  SentinelOneGetRemoteScriptStatusParamsSchema,
  SentinelOneIsolateHostParamsSchema,
  SentinelOneSecretsSchema,
  SentinelOneActionParamsSchema,
  SentinelOneFetchAgentFilesParamsSchema,
  SentinelOneFetchAgentFilesResponseSchema,
  SentinelOneDownloadAgentFileParamsSchema,
  SentinelOneGetActivitiesParamsSchema,
  SentinelOneGetActivitiesResponseSchema,
  SentinelOneExecuteScriptResponseSchema,
  SentinelOneGetRemoteScriptResultsParamsSchema,
  SentinelOneDownloadRemoteScriptResultsParamsSchema,
  SentinelOneGetActivitiesResponseNoDataSchema,
} from '../schemas/v1';

interface SentinelOnePagination {
  pagination: {
    totalItems: number;
    nextCursor?: string;
  };
}

interface SentinelOneErrors {
  errors?: string[];
}

export type SentinelOneOsType = 'linux' | 'macos' | 'windows';

export type SentinelOneConfig = z.infer<typeof SentinelOneConfigSchema>;
export type SentinelOneSecrets = z.infer<typeof SentinelOneSecretsSchema>;

export type SentinelOneBaseApiResponse = z.infer<typeof SentinelOneBaseApiResponseSchema>;

export type SentinelOneGetAgentsParams = Partial<z.infer<typeof SentinelOneGetAgentsParamsSchema>>;
export type SentinelOneGetAgentsResponse = z.input<typeof SentinelOneGetAgentsResponseSchema>;

export type SentinelOneExecuteScriptParams = z.infer<typeof SentinelOneExecuteScriptParamsSchema>;
export type SentinelOneExecuteScriptResponse = z.infer<
  typeof SentinelOneExecuteScriptResponseSchema
>;

export interface SentinelOneRemoteScriptExecutionStatus {
  accountId: string;
  accountName: string;
  agentComputerName: string;
  agentId: string;
  agentIsActive: boolean;
  agentIsDecommissioned: boolean;
  agentMachineType: string;
  agentOsType: SentinelOneOsType;
  agentUuid: string;
  createdAt: string;
  description?: string;
  detailedStatus?: string;
  groupId: string;
  groupName: string;
  /** The `id` can be used to retrieve the script results file from sentinleone */
  id: string;
  initiatedBy: string;
  initiatedById: string;
  parentTaskId: string;
  /** `scriptResultsSignature` will be present only when there is a file with results */
  scriptResultsSignature?: string;
  siteId: string;
  siteName: string;
  status:
    | 'canceled'
    | 'completed'
    | 'created'
    | 'expired'
    | 'failed'
    | 'in_progress'
    | 'partially_completed'
    | 'pending'
    | 'pending_user_action'
    | 'scheduled';
  statusCode?: string;
  statusDescription: string;
  type: string;
  updatedAt: string;
}

export type SentinelOneGetRemoteScriptStatusParams = z.infer<
  typeof SentinelOneGetRemoteScriptStatusParamsSchema
>;

export interface SentinelOneGetRemoteScriptStatusApiResponse
  extends SentinelOnePagination,
    SentinelOneErrors {
  data: SentinelOneRemoteScriptExecutionStatus[];
}

export type SentinelOneGetRemoteScriptResultsParams = z.infer<
  typeof SentinelOneGetRemoteScriptResultsParamsSchema
>;

export interface SentinelOneGetRemoteScriptResults {
  download_links: Array<{
    downloadUrl: string;
    fileName: string;
    taskId: string;
  }>;
  errors?: Array<{
    taskId: string;
    errorString: string;
  }>;
}

export interface SentinelOneGetRemoteScriptResultsApiResponse extends SentinelOneErrors {
  data: SentinelOneGetRemoteScriptResults;
}

export type SentinelOneDownloadRemoteScriptResultsParams = z.infer<
  typeof SentinelOneDownloadRemoteScriptResultsParamsSchema
>;

export type SentinelOneGetRemoteScriptsParams = Partial<
  z.infer<typeof SentinelOneGetRemoteScriptsParamsSchema>
>;

export type SentinelOneGetRemoteScriptsResponse = z.input<
  typeof SentinelOneGetRemoteScriptsResponseSchema
>;

export type SentinelOneFetchAgentFilesParams = Mutable<
  z.infer<typeof SentinelOneFetchAgentFilesParamsSchema>
>;
export type SentinelOneFetchAgentFilesResponse = z.infer<
  typeof SentinelOneFetchAgentFilesResponseSchema
>;

export type SentinelOneDownloadAgentFileParams = Mutable<
  z.infer<typeof SentinelOneDownloadAgentFileParamsSchema>
>;

export type SentinelOneGetActivitiesResponseData = z.infer<
  typeof SentinelOneGetActivitiesResponseNoDataSchema
>;
export type SentinelOneActivityRecord<TData = unknown> = SentinelOneGetActivitiesResponseData & {
  data: TData;
};

export type SentinelOneGetActivitiesParams = z.infer<typeof SentinelOneGetActivitiesParamsSchema>;

export type SentinelOneGetActivitiesResponse<TData = unknown> = Omit<
  z.infer<typeof SentinelOneGetActivitiesResponseSchema>,
  'data'
> & { data: Array<SentinelOneActivityRecord<TData>> };

export type SentinelOneIsolateHostParams = Partial<
  Mutable<z.infer<typeof SentinelOneIsolateHostParamsSchema>>
>;

export type SentinelOneActionParams = z.infer<typeof SentinelOneActionParamsSchema>;
