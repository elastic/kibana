/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import type {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionGetCapabilitiesParamsSchema,
  ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
  ExecutorSubActionGetIssuesParamsSchema,
  ExecutorSubActionGetIssueParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
} from '../schemas/v1';

export type JiraPublicConfigurationType = z.infer<
  typeof ExternalIncidentServiceConfigurationSchema
>;
export type JiraSecretConfigurationType = z.infer<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ActionParamsType = z.infer<typeof ExecutorParamsSchema>;

export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = z.infer<typeof ExecutorSubActionPushParamsSchema>;

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

export type ExternalServiceParams = Record<string, unknown>;

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export interface CreateIncidentParams {
  incident: Incident;
}

export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: SimpleComment;
}

export interface FieldsSchema {
  type: string;
  [key: string]: string;
}

export type GetIssueTypesResponse = Array<{ id: string; name: string }>;

export interface FieldSchema {
  type: string;
  items?: string;
}
export type GetFieldsByIssueTypeResponse = Record<
  string,
  {
    allowedValues: Array<{}>;
    defaultValue: {};
    required: boolean;
    schema: FieldSchema;
    name: string;
  }
>;
export type GetCommonFieldsResponse = GetFieldsByIssueTypeResponse;

export type GetIssuesResponse = Array<{ id: string; key: string; title: string }>;
export interface GetIssueResponse {
  id: string;
  key: string;
  title: string;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;

export type ExecutorSubActionGetIncidentParams = z.infer<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = z.infer<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ExecutorSubActionGetCapabilitiesParams = z.infer<
  typeof ExecutorSubActionGetCapabilitiesParamsSchema
>;

export type ExecutorSubActionCommonFieldsParams = z.infer<
  typeof ExecutorSubActionCommonFieldsParamsSchema
>;

export type ExecutorSubActionGetFieldsByIssueTypeParams = z.infer<
  typeof ExecutorSubActionGetFieldsByIssueTypeParamsSchema
>;

export type ExecutorSubActionGetIssuesParams = z.infer<
  typeof ExecutorSubActionGetIssuesParamsSchema
>;

export type ExecutorSubActionGetIssueParams = z.infer<typeof ExecutorSubActionGetIssueParamsSchema>;

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export type JiraExecutorResultData =
  | PushToServiceResponse
  | GetIssueTypesResponse
  | GetFieldsByIssueTypeResponse
  | GetIssuesResponse
  | GetIssueResponse
  | ExternalServiceParams;

export interface Fields {
  [key: string]: string | string[] | { name: string } | { key: string } | { id: string };
}

export interface SimpleComment {
  comment: string;
  commentId: string;
}
export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}
