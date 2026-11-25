/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ISO_DATE_HINT, idString } from './types';

// searchAlerts
export const SearchAlertsInputSchema = lazySchema(() =>
  z.object({
    severity: z
      .array(z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']))
      .max(5)
      .optional()
      .describe('Severities'),
    incidentStatus: z
      .array(z.enum(['UNRESOLVED', 'IN_PROGRESS', 'RESOLVED']))
      .max(3)
      .optional()
      .describe('Incident statuses'),
    analystVerdict: z
      .array(z.enum(['UNDEFINED', 'TRUE_POSITIVE', 'FALSE_POSITIVE', 'SUSPICIOUS']))
      .max(4)
      .optional()
      .describe('Analyst verdicts'),
    createdAtGte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Created at or after, ${ISO_DATE_HINT}`),
    createdAtLte: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Created at or before, ${ISO_DATE_HINT}`),
    ids: z.array(idString(32)).max(1000).optional().describe('Alert ids'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
    cursor: z
      .string()
      .max(2048)
      .optional()
      .describe('nextCursor of the previous page (same filters)'),
  })
);
export type SearchAlertsInput = z.infer<typeof SearchAlertsInputSchema>;

// updateAlertVerdict
export const UpdateAlertVerdictInputSchema = lazySchema(() =>
  z.object({
    alertIds: z.array(idString(32)).min(1).max(1000).describe('Alert ids from searchAlerts'),
    analystVerdict: z
      .enum(['undefined', 'true_positive', 'false_positive', 'suspicious'])
      .describe('Analyst verdict'),
  })
);
export type UpdateAlertVerdictInput = z.infer<typeof UpdateAlertVerdictInputSchema>;

// updateAlertStatus
export const UpdateAlertStatusInputSchema = lazySchema(() =>
  z.object({
    alertIds: z.array(idString(32)).min(1).max(1000).describe('Alert ids from searchAlerts'),
    incidentStatus: z.enum(['unresolved', 'in_progress', 'resolved']).describe('Incident status'),
  })
);
export type UpdateAlertStatusInput = z.infer<typeof UpdateAlertStatusInputSchema>;

// createStarRule
export const CreateStarRuleInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(255).describe('Rule name'),
    severity: z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']).describe('Severity'),
    queryType: z
      .enum(['events', 'correlation', 'uebafirstseen', 'scheduled'])
      .describe('Query type'),
    s1ql: z.string().min(1).max(4096).describe('Detection query (S1QL)'),
    status: z
      .enum(['Draft', 'Active', 'Disabled'])
      .optional()
      .describe('Rule status (default Draft)'),
    description: z.string().max(2000).optional().describe('Description'),
    expirationMode: z
      .enum(['Permanent', 'Temporary'])
      .optional()
      .describe('Expiration mode (default Permanent)'),
    expiration: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Expiry, required when expirationMode is Temporary; ${ISO_DATE_HINT}`),
    treatAsThreat: z
      .enum(['UNDEFINED', 'Suspicious', 'Malicious'])
      .optional()
      .describe('Raise matches as threats'),
    networkQuarantine: z
      .boolean()
      .optional()
      .describe('Network-quarantine the endpoint on a match (default false)'),
    queryLang: z.enum(['1.0', '2.0']).optional().describe('Query language version'),
    accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
    siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
    groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
    tenant: z.boolean().optional().describe('Global scope; one scope is required'),
  })
);
export type CreateStarRuleInput = z.infer<typeof CreateStarRuleInputSchema>;

// updateStarRule
export const UpdateStarRuleInputSchema = lazySchema(() =>
  z.object({
    ruleId: idString(32).describe('Rule id'),
    name: z.string().max(255).optional().describe('Rule name'),
    severity: z.enum(['Info', 'Low', 'Medium', 'High', 'Critical']).optional().describe('Severity'),
    status: z.enum(['Draft', 'Active', 'Disabled']).optional().describe('Rule status'),
    s1ql: z.string().max(4096).optional().describe('Detection query (S1QL)'),
    description: z.string().max(2000).optional().describe('Description'),
    expirationMode: z
      .enum(['Permanent', 'Temporary'])
      .optional()
      .describe('Expiration mode (default Permanent)'),
    expiration: z
      .string()
      .min(1)
      .max(40)
      .optional()
      .describe(`Expiry, required when expirationMode is Temporary; ${ISO_DATE_HINT}`),
    treatAsThreat: z
      .enum(['UNDEFINED', 'Suspicious', 'Malicious'])
      .optional()
      .describe('Raise matches as threats'),
    networkQuarantine: z
      .boolean()
      .optional()
      .describe('Network-quarantine the endpoint on a match (default false)'),
    queryLang: z.enum(['1.0', '2.0']).optional().describe('Query language version'),
  })
);
export type UpdateStarRuleInput = z.infer<typeof UpdateStarRuleInputSchema>;

// enableStarRules
export const EnableStarRulesInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z.array(idString(32)).min(1).max(1000).describe('Rule ids'),
  })
);
export type EnableStarRulesInput = z.infer<typeof EnableStarRulesInputSchema>;

// disableStarRules
export const DisableStarRulesInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z.array(idString(32)).min(1).max(1000).describe('Rule ids'),
  })
);
export type DisableStarRulesInput = z.infer<typeof DisableStarRulesInputSchema>;

// deleteStarRule
export const DeleteStarRuleInputSchema = lazySchema(() =>
  z.object({
    ruleIds: z.array(idString(32)).min(1).max(1000).describe('Rule ids'),
  })
);
export type DeleteStarRuleInput = z.infer<typeof DeleteStarRuleInputSchema>;
