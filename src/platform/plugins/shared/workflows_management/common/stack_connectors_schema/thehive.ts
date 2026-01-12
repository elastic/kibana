/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/thehive/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */

import { z } from '@kbn/zod/v4';

// TheHive severity levels
export enum TheHiveSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// TheHive TLP (Traffic Light Protocol) levels
export enum TheHiveTLP {
  CLEAR = 0,
  GREEN = 1,
  AMBER = 2,
  AMBER_STRICT = 3,
  RED = 4,
}

// TheHive connector parameter schemas for different sub-actions
export const TheHivePushToServiceParamsSchema = z.object({
  incident: z.object({
    title: z.string(),
    description: z.string(),
    externalId: z.string().nullable().optional(),
    severity: z.number().default(TheHiveSeverity.MEDIUM).nullable().optional(),
    tlp: z.number().default(TheHiveTLP.AMBER).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
  }),
  comments: z
    .array(
      z.object({
        comment: z.string(),
        commentId: z.string(),
      })
    )
    .nullable()
    .optional(),
});

export const TheHiveCreateAlertParamsSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.string(),
  source: z.string(),
  sourceRef: z.string(),
  severity: z.number().default(TheHiveSeverity.MEDIUM).nullable().optional(),
  isRuleSeverity: z.boolean().default(false).nullable().optional(),
  tlp: z.number().default(TheHiveTLP.AMBER).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  body: z.string().nullable().optional(),
});

export const TheHiveGetIncidentParamsSchema = z.object({
  externalId: z.string(),
});

// TheHive connector response schemas
export const TheHiveIncidentResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  _createdBy: z.string(),
  _updatedBy: z.string().nullable().optional(),
  _createdAt: z.number(),
  _updatedAt: z.number().nullable().optional(),
  number: z.number(),
  title: z.string(),
  description: z.string(),
  severity: z.number(),
  severityLabel: z.string(),
  startDate: z.number(),
  endDate: z.number().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  flag: z.boolean(),
  tlp: z.number(),
  tlpLabel: z.string(),
  pap: z.number(),
  papLabel: z.string(),
  status: z.string(),
  stage: z.string(),
  summary: z.string().nullable().optional(),
  impactStatus: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
});

export const TheHiveCreateAlertResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  _createdBy: z.string(),
  _createdAt: z.number(),
  title: z.string(),
  description: z.string(),
  type: z.string(),
  source: z.string(),
  sourceRef: z.string(),
  severity: z.number(),
  tlp: z.number(),
  tags: z.array(z.string()).optional(),
});
