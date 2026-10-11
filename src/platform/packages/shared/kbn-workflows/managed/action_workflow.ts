/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * The contract an **action workflow** satisfies. Lives here rather than in a
 * consuming plugin because the action YAML files live here, so the definitions
 * and the schema they are checked against cannot drift apart.
 *
 * An action workflow is an ordinary managed workflow that a human approves
 * before it runs. It:
 *
 * 1. carries {@link ACTION_WORKFLOW_TAG}, so the catalog is discoverable by tag
 *    rather than from a hardcoded list;
 * 2. declares {@link actionMetadataSchema} under `consts.actionMetadata`, because
 *    unknown top-level YAML keys are stripped by the workflow schema;
 * 3. takes a single {@link ACTION_WORKFLOW_INPUT} object, so a generic gate never
 *    needs to know an action's parameter names;
 * 4. ends in a `workflow.output` step, because `workflow.execute` cannot type a
 *    child's result.
 */
export const ACTION_WORKFLOW_TAG = 'action' as const;

/** The single input every action workflow accepts. */
export const ACTION_WORKFLOW_INPUT = 'actionInput' as const;

/**
 * Grouping axis for the decision queue an approved action feeds. Deliberately
 * an arbitrary keyword rather than an enum: each solution owns the vocabulary
 * its own actions and queries use, and AlertZero's set is not NightShift's.
 * Consumers group and aggregate on it — nothing sorts on it, and the display
 * order of categories is a UI concern rather than something stored.
 */
export const actionCategorySchema = z.string().min(1).max(64);
export type ActionCategory = z.infer<typeof actionCategorySchema>;

/** How consequential running the action is. Intrinsic to the action, not the situation. */
export const actionImpactSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ActionImpact = z.infer<typeof actionImpactSchema>;

/**
 * `always-gate` actions must never be auto-approved, whatever a caller's
 * autonomy policy resolves to.
 */
export const actionApprovalPolicySchema = z.enum(['always-gate', 'autonomy-dependent']);
export type ActionApprovalPolicy = z.infer<typeof actionApprovalPolicySchema>;

/** Self-description an action workflow declares under `consts.actionMetadata`. */
export const actionMetadataSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2048).optional(),
  category: actionCategorySchema.optional(),
  impact: actionImpactSchema.optional(),
  reversible: z.boolean().optional(),
  approvalPolicy: actionApprovalPolicySchema.optional(),
});
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;
