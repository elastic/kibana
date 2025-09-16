/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/servicenow_itsm/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod';

// ServiceNow ITSM connector parameter schemas
export const ServiceNowCreateIncidentParamsSchema = z.object({
  incident: z.object({
    short_description: z.string(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    severity: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    correlation_id: z.string().optional(),
    correlation_display: z.string().optional(),
    additional_fields: z.record(z.string(), z.any()).optional(),
  }),
});

export const ServiceNowUpdateIncidentParamsSchema = z.object({
  incident: z.object({
    short_description: z.string().optional(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    severity: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    correlation_id: z.string().optional(),
    correlation_display: z.string().optional(),
    additional_fields: z.record(z.string(), z.any()).optional(),
  }),
  incidentId: z.string(),
});

export const ServiceNowGetIncidentParamsSchema = z.object({
  id: z.string(),
});

// ServiceNow SIR connector parameter schemas
export const ServiceNowCreateSecurityIncidentParamsSchema = z.object({
  incident: z.object({
    short_description: z.string(),
    description: z.string().optional(),
    dest_ip: z.string().optional(),
    source_ip: z.string().optional(),
    malware_hash: z.string().optional(),
    malware_url: z.string().optional(),
    priority: z.string().optional(),
    additional_fields: z.record(z.string(), z.any()).optional(),
  }),
});

// ServiceNow connector response schemas
export const ServiceNowIncidentResponseSchema = z.object({
  sys_id: z.string(),
  number: z.string(),
  short_description: z.string(),
  description: z.string().optional(),
  state: z.string(),
  impact: z.string().optional(),
  urgency: z.string().optional(),
  priority: z.string().optional(),
  sys_created_on: z.string(),
  sys_updated_on: z.string(),
});
