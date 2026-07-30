/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MutingRuleConditionSchema = z.object({
  attribute: z
    .string()
    .max(200)
    .describe(
      'Alert event attribute to match, e.g. "policyId", "conditionId", "product", "entity.guid", "targetId", or "tags.<name>".'
    ),
  operator: z
    .enum([
      'ANY',
      'CONTAINS',
      'ENDS_WITH',
      'EQUALS',
      'IN',
      'IS_BLANK',
      'IS_NOT_BLANK',
      'NOT_CONTAINS',
      'NOT_ENDS_WITH',
      'NOT_EQUALS',
      'NOT_IN',
      'NOT_STARTS_WITH',
      'STARTS_WITH',
    ])
    .describe('Comparison operator applied to the attribute.'),
  values: z
    .array(z.string().max(500))
    .max(500)
    .describe('Values to compare the attribute against, e.g. ["123456"].'),
});

const MutingRuleConditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']).describe('Boolean operator used to combine the sub-conditions.'),
  conditions: z
    .array(MutingRuleConditionSchema)
    .min(1)
    .max(20)
    .describe('Up to 20 sub-conditions combined with the group operator.'),
});

export const NewRelicAcknowledgeIssueInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID that owns the issue.'),
    issueId: z
      .string()
      .max(200)
      .describe('ID of the AI issue to acknowledge, e.g. "f0846f5e-fc9d-4dc0-afdd-07cce7cc6fc4".'),
  })
);
export type NewRelicAcknowledgeIssueInput = z.infer<typeof NewRelicAcknowledgeIssueInputSchema>;

export const NewRelicUnacknowledgeIssueInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID that owns the issue.'),
    issueId: z.string().max(200).describe('ID of the AI issue to unacknowledge.'),
  })
);
export type NewRelicUnacknowledgeIssueInput = z.infer<typeof NewRelicUnacknowledgeIssueInputSchema>;

export const NewRelicResolveIssueInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID that owns the issue.'),
    issueId: z.string().max(200).describe('ID of the AI issue to resolve/close.'),
  })
);
export type NewRelicResolveIssueInput = z.infer<typeof NewRelicResolveIssueInputSchema>;

export const NewRelicListIssuesInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to list issues for.'),
    states: z
      .array(z.enum(['ACTIVATED', 'CREATED', 'DEACTIVATED', 'CLOSED']))
      .optional()
      .describe('Filter by issue state. Omit to include all states.'),
    priority: z
      .array(z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']))
      .optional()
      .describe('Filter by issue priority.'),
    entityGuids: z
      .array(z.string().max(200))
      .max(50)
      .optional()
      .describe('Restrict results to issues affecting these entity GUIDs.'),
    since: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Only return issues active at or after this ISO 8601 time, e.g. "2024-06-01T00:00:00Z". Defaults to the last 24 hours if omitted.'
      ),
    until: z
      .string()
      .max(40)
      .optional()
      .describe('Only return issues active at or before this ISO 8601 time.'),
    cursor: z
      .string()
      .max(500)
      .optional()
      .describe("Pagination cursor from a previous listIssues call's nextCursor field."),
  })
);
export type NewRelicListIssuesInput = z.infer<typeof NewRelicListIssuesInputSchema>;

export const NewRelicListIncidentsInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to list incidents for.'),
    states: z
      .array(z.enum(['CREATED', 'CLOSED']))
      .optional()
      .describe('Filter by incident state.'),
    priority: z
      .array(z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']))
      .optional()
      .describe('Filter by incident priority.'),
    entityGuids: z
      .array(z.string().max(200))
      .max(50)
      .optional()
      .describe('Restrict results to incidents affecting these entity GUIDs.'),
    since: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Only return incidents active at or after this ISO 8601 time, e.g. "2024-06-01T00:00:00Z". Defaults to the last 24 hours if omitted.'
      ),
    until: z
      .string()
      .max(40)
      .optional()
      .describe('Only return incidents active at or before this ISO 8601 time.'),
    cursor: z
      .string()
      .max(500)
      .optional()
      .describe("Pagination cursor from a previous listIncidents call's nextCursor field."),
  })
);
export type NewRelicListIncidentsInput = z.infer<typeof NewRelicListIncidentsInputSchema>;

export const NewRelicCreateMutingRuleInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to create the muting rule in.'),
    name: z
      .string()
      .max(200)
      .describe('Name of the muting rule, e.g. "Deploy window - checkout-service".'),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe('Free-text description of why the rule exists.'),
    enabled: z.boolean().default(true).describe('Whether the rule is active immediately.'),
    condition: MutingRuleConditionGroupSchema.describe(
      'The set of sub-conditions (attribute/operator/values) that define which alert events this rule suppresses.'
    ),
  })
);
export type NewRelicCreateMutingRuleInput = z.infer<typeof NewRelicCreateMutingRuleInputSchema>;

export const NewRelicUpdateMutingRuleInputSchema = lazySchema(() =>
  z
    .object({
      accountId: z.number().int().describe('New Relic account ID that owns the muting rule.'),
      mutingRuleId: z.string().max(200).describe('ID of the muting rule to update.'),
      name: z.string().max(200).optional().describe('New name for the rule.'),
      description: z.string().max(1000).optional().describe('New description for the rule.'),
      enabled: z.boolean().optional().describe('Enable or disable the rule.'),
      condition: MutingRuleConditionGroupSchema.optional().describe(
        'Replacement condition group for the rule.'
      ),
    })
    .refine(
      (v) =>
        v.name !== undefined ||
        v.description !== undefined ||
        v.enabled !== undefined ||
        v.condition !== undefined,
      { message: 'At least one of name, description, enabled, or condition must be provided.' }
    )
);
export type NewRelicUpdateMutingRuleInput = z.infer<typeof NewRelicUpdateMutingRuleInputSchema>;

export const NewRelicDeleteMutingRuleInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID that owns the muting rule.'),
    mutingRuleId: z.string().max(200).describe('ID of the muting rule to delete.'),
  })
);
export type NewRelicDeleteMutingRuleInput = z.infer<typeof NewRelicDeleteMutingRuleInputSchema>;

export const NewRelicListMutingRulesInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to list muting rules for.'),
  })
);
export type NewRelicListMutingRulesInput = z.infer<typeof NewRelicListMutingRulesInputSchema>;

export const NewRelicRunNrqlQueryInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to run the query against.'),
    nrql: z
      .string()
      .max(4000)
      .describe('The NRQL query string, e.g. "SELECT count(*) FROM Transaction SINCE 1 HOUR AGO".'),
    timeoutSeconds: z
      .number()
      .int()
      .min(1)
      .max(120)
      .optional()
      .describe('Query timeout in seconds. Defaults to 70.'),
  })
);
export type NewRelicRunNrqlQueryInput = z.infer<typeof NewRelicRunNrqlQueryInputSchema>;

export const NewRelicCreateDeploymentMarkerInputSchema = lazySchema(() =>
  z.object({
    entityGuid: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9+/=_-]+$/, 'Must be a New Relic entity GUID (base64url characters only).')
      .describe('GUID of the entity the deployment applies to.'),
    version: z.string().max(200).optional().describe('Deployed version identifier, e.g. "1.4.2".'),
    description: z
      .string()
      .max(1000)
      .optional()
      .describe('Free-text description of the deployment.'),
    user: z
      .string()
      .max(200)
      .optional()
      .describe('Name or identifier of who/what triggered the deployment.'),
    deploymentType: z
      .enum(['Basic', 'Blue Green', 'Canary', 'Rolling', 'Shadow'])
      .optional()
      .describe(
        'Standard New Relic deployment type for the "Deployment" category. Defaults to "Basic".'
      ),
    groupId: z
      .string()
      .max(200)
      .optional()
      .describe('Optional identifier to correlate this deployment across multiple entities.'),
    timestamp: z
      .string()
      .max(40)
      .optional()
      .describe('ISO 8601 timestamp of the deployment. Defaults to now.'),
  })
);
export type NewRelicCreateDeploymentMarkerInput = z.infer<
  typeof NewRelicCreateDeploymentMarkerInputSchema
>;

export const NewRelicListAlertPoliciesInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to list alert policies for.'),
    nameFilter: z
      .string()
      .max(200)
      .optional()
      .describe('Case-insensitive substring filter on the policy name.'),
    cursor: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor returned by a previous listAlertPolicies call.'),
  })
);
export type NewRelicListAlertPoliciesInput = z.infer<typeof NewRelicListAlertPoliciesInputSchema>;

export const NewRelicListNrqlConditionsInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID that owns the policy.'),
    policyId: z.string().max(200).describe('ID of the alert policy to list NRQL conditions for.'),
  })
);
export type NewRelicListNrqlConditionsInput = z.infer<typeof NewRelicListNrqlConditionsInputSchema>;

export const NewRelicCreateAlertPolicyInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to create the policy in.'),
    name: z.string().max(200).describe('Name of the new alert policy.'),
    incidentPreference: z
      .enum(['PER_POLICY', 'PER_CONDITION', 'PER_CONDITION_AND_TARGET'])
      .optional()
      .describe('How incidents are grouped for this policy. Defaults to PER_POLICY.'),
  })
);
export type NewRelicCreateAlertPolicyInput = z.infer<typeof NewRelicCreateAlertPolicyInputSchema>;

export const NewRelicCreateNrqlConditionInputSchema = lazySchema(() =>
  z.object({
    accountId: z.number().int().describe('New Relic account ID to create the condition in.'),
    policyId: z.string().max(200).describe('ID of the alert policy to attach the condition to.'),
    name: z.string().max(200).describe('Name of the NRQL condition.'),
    nrql: z
      .string()
      .max(4000)
      .describe(
        'The NRQL query the condition evaluates, e.g. "SELECT count(*) FROM TransactionError".'
      ),
    thresholdOperator: z
      .enum(['ABOVE', 'BELOW', 'EQUALS'])
      .describe('Operator used to compare the query result to the critical threshold.'),
    thresholdValue: z.number().describe('Critical threshold value.'),
    thresholdDurationSeconds: z
      .number()
      .int()
      .min(60)
      .max(7200)
      .multipleOf(60)
      .describe(
        'Number of seconds the threshold must be violated before triggering. Must be a multiple of 60.'
      ),
    enabled: z.boolean().default(true).describe('Whether the condition is active immediately.'),
  })
);
export type NewRelicCreateNrqlConditionInput = z.infer<
  typeof NewRelicCreateNrqlConditionInputSchema
>;
