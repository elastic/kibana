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
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExternalServiceIncidentResponseSchema,
  GetIncidentResponseSchema,
  ExternalServiceFieldsSchema,
} from '../schemas/v1';

export type GetIncidentTypesResponse = Array<{ id: string; name: string }>;
export type GetSeverityResponse = Array<{ id: string; name: string }>;

export interface ExternalServiceFields {
  input_type: string;
  name: string;
  read_only: boolean;
  required?: string;
  text: string;
}
export type GetCommonFieldsResponse = ExternalServiceFields[];

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export type ResilientFieldMeta = z.input<typeof ExternalServiceFieldsSchema>;

export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}

export interface ResilientTextField {
  text: string;
}

export interface ResilientMultiselectField {
  ids: number[];
}
export interface ResilientSelectField {
  id: number;
}

export interface ResilientTextAreaField {
  textarea: { format: 'html' | 'text'; content: string };
}

export interface ResilientDateField {
  date: number;
}

export interface ResilientBooleanField {
  boolean: boolean;
}

export interface ResilientNumberField {
  object: number;
}

export type ResilientUpdateFieldValue =
  | ResilientTextField
  | ResilientTextAreaField
  | ResilientMultiselectField
  | ResilientSelectField
  | ResilientDateField
  | ResilientBooleanField
  | ResilientNumberField
  | unknown;

export type ResilientFieldPrimitives =
  | string
  | number
  | number[]
  | boolean
  | ResilientTextAreaField['textarea']
  | null;

interface UpdateField {
  field: { name: string };
  old_value: ResilientUpdateFieldValue;
  new_value: ResilientUpdateFieldValue;
}

export interface UpdateIncidentRequest {
  changes: UpdateField[];
}

export interface CreateIncidentData extends Record<string, unknown> {
  name: string;
  discovered_date: number;
  description?: { format: string; content: string };
  incident_type_ids?: Array<{ id: number }>;
  severity_code?: { id: number };
  [unknown: string]: unknown;
}

export type ResilientConfig = z.infer<typeof ExternalIncidentServiceConfigurationSchema>;
export type ResilientSecrets = z.infer<typeof ExternalIncidentServiceSecretConfigurationSchema>;

export type ExecutorSubActionPushParams = z.infer<typeof ExecutorSubActionPushParamsSchema>;

export type ExternalServiceIncidentResponse = z.infer<typeof ExternalServiceIncidentResponseSchema>;
export type GetIncidentResponse = z.infer<typeof GetIncidentResponseSchema>;
