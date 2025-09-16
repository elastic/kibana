/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/crowdstrike/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod';

// CrowdStrike connector parameter schemas for different sub-actions
export const CrowdStrikeHostActionsParamsSchema = z.object({
  command: z.enum(['contain', 'lift_containment']),
  ids: z.array(z.string()),
  actionParameters: z.record(z.string(), z.any()).optional(),
  alertIds: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export const CrowdStrikeGetAgentDetailsParamsSchema = z.object({
  ids: z.array(z.string()).optional(),
  filter: z.string().optional(),
});

export const CrowdStrikeGetAgentOnlineStatusParamsSchema = z.object({
  ids: z.array(z.string()),
});

export const CrowdStrikeExecuteRTRCommandParamsSchema = z.object({
  command: z.string(),
  hostIds: z.array(z.string()),
  sessionId: z.string().optional(),
});

export const CrowdStrikeExecuteActiveResponderRTRParamsSchema = z.object({
  command: z.string(),
  hostIds: z.array(z.string()),
  sessionId: z.string().optional(),
  commandString: z.string(),
});

export const CrowdStrikeExecuteAdminRTRParamsSchema = z.object({
  command: z.string(),
  hostIds: z.array(z.string()),
  sessionId: z.string().optional(),
  commandString: z.string(),
});

export const CrowdStrikeGetRTRCloudScriptsParamsSchema = z.object({
  filter: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

// CrowdStrike connector response schema
export const CrowdStrikeResponseSchema = z.object({
  meta: z.object({
    query_time: z.number(),
    powered_by: z.string(),
    trace_id: z.string(),
  }),
  resources: z.array(
    z.object({
      device_id: z.string(),
      hostname: z.string(),
      local_ip: z.string().optional(),
      external_ip: z.string().optional(),
      os_version: z.string().optional(),
      status: z.string().optional(),
      last_seen: z.string().optional(),
    })
  ),
  errors: z
    .array(
      z.object({
        code: z.number(),
        message: z.string(),
      })
    )
    .optional(),
});
