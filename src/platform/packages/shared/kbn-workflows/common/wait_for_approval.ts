/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonModelSchemaType } from '../spec/schema/common/json_model_schema';

export const DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL = 'Approve' as const;
export const DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL = 'Decline' as const;
export const DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT = '24h' as const;

export const WAIT_FOR_APPROVAL_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    approved: {
      type: 'boolean',
      description: 'Whether the request was approved',
    },
  },
  required: ['approved'],
} as const satisfies JsonModelSchemaType;

export const WAIT_FOR_APPROVAL_STEP_TYPES = ['waitForInput', 'waitForApproval'] as const;

export type HitlWaitStepType = (typeof WAIT_FOR_APPROVAL_STEP_TYPES)[number];

export const isHitlWaitStepType = (stepType: string | undefined): stepType is HitlWaitStepType =>
  stepType === 'waitForInput' || stepType === 'waitForApproval';
