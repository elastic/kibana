/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG =
  'securitySolution.managedAlertAnalysisWorkflowEnabled' as const;
export const MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT = true as const;

export const ALERT_ANALYSIS_WORKFLOW_API_VERSION = '1' as const;

export const ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/settings' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_stats' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_selection' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_update' as const;

export const AlertAnalysisWorkflowSettings = z.object({
  autoCloseEnabled: z.boolean(),
  autoCloseConfidenceScoreMinThreshold: z.number().min(0).max(1),
  autoCloseConfidenceScoreMaxThreshold: z.number().min(0).max(1),
});

export type AlertAnalysisWorkflowSettings = z.infer<typeof AlertAnalysisWorkflowSettings>;

export const AlertAnalysisWorkflowSettingsRequestBody = AlertAnalysisWorkflowSettings.refine(
  ({ autoCloseConfidenceScoreMinThreshold, autoCloseConfidenceScoreMaxThreshold }) =>
    autoCloseConfidenceScoreMinThreshold < autoCloseConfidenceScoreMaxThreshold,
  {
    message: 'Minimum confidence score must be lower than maximum confidence score',
    path: ['autoCloseConfidenceScoreMaxThreshold'],
  }
);

export type AlertAnalysisWorkflowSettingsRequestBody = z.infer<
  typeof AlertAnalysisWorkflowSettingsRequestBody
>;

export interface AlertAnalysisWorkflowSettingsResponse {
  settings: AlertAnalysisWorkflowSettings;
  workflowId: string;
}

export const AlertAnalysisWorkflowRuleAttachmentListRequestQuery = z.object({
  search: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AlertAnalysisWorkflowRuleAttachmentListRequestQuery = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentListRequestQuery
>;

export const AlertAnalysisWorkflowRuleAttachmentStatsRequestBody = z.object({
  search: z.string().optional().default(''),
});

export type AlertAnalysisWorkflowRuleAttachmentStatsRequestBody = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentStatsRequestBody
>;

export const AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody =
  AlertAnalysisWorkflowRuleAttachmentStatsRequestBody;

export type AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody
>;

export const AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody = z
  .object({
    attachRuleIds: z.array(z.string()).max(2000).optional().default([]),
    detachRuleIds: z.array(z.string()).max(2000).optional().default([]),
    dryRun: z.boolean().optional().default(false),
  })
  .refine(({ attachRuleIds, detachRuleIds }) => attachRuleIds.length + detachRuleIds.length > 0, {
    message: 'At least one rule update is required',
  });

export type AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody
>;

export interface RuleAttachmentQuery {
  search: string;
}

export interface AlertAnalysisWorkflowRuleAttachmentService {
  getRuleAttachmentStats(params: RuleAttachmentQuery): Promise<RuleAttachmentStats>;
  getRuleAttachments(params: GetRuleAttachmentsParams): Promise<RuleAttachmentPage>;
  getRuleAttachmentSelection(params: RuleAttachmentQuery): Promise<RuleAttachmentSelection>;
  updateRuleAttachments(params: UpdateRuleAttachmentsParams): Promise<UpdateRuleAttachmentsResult>;
}

export interface GetRuleAttachmentsParams extends RuleAttachmentQuery {
  page: number;
  perPage: number;
}

export interface RuleAttachmentStats {
  total: number;
  attached: number;
}

export interface RuleAttachmentPage extends RuleAttachmentStats {
  page: number;
  perPage: number;
  rules: RuleAttachmentSummary[];
}

export interface RuleAttachmentSelection extends RuleAttachmentStats {
  selectable: number;
  attachedRuleIds: string[];
  ruleIds: string[];
}

export interface RuleAttachmentSummary {
  id: string;
  name: string;
  enabled: boolean;
  attached: boolean;
}

export interface UpdateRuleAttachmentsParams {
  attachRuleIds: string[];
  detachRuleIds: string[];
  dryRun?: boolean;
}

export interface UpdateRuleAttachmentsResult {
  matched: number;
  updated: number;
}
