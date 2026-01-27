/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/resilient/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// Resilient connector parameter schemas for different sub-actions
export const ResilientCreateIncidentParamsSchema = z.object({
  incident: z.object({
    name: z.string(),
    description: z.string().optional(),
    incidentTypes: z.array(z.number()).optional(),
    severityCode: z.number().optional(),
  }),
});

export const ResilientUpdateIncidentParamsSchema = z.object({
  incident: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    incidentTypes: z.array(z.number()).optional(),
    severityCode: z.number().optional(),
  }),
  incidentId: z.string(),
});

export const ResilientAddCommentParamsSchema = z.object({
  incidentId: z.string(),
  comment: z.object({
    text: z.string(),
  }),
});

// Resilient connector response schema
export const ResilientIncidentResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  discovered_date: z.number(),
  create_date: z.number(),
  severity_code: z.number().optional(),
  incident_type_ids: z.array(z.number()).optional(),
});
