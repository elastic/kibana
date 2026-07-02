/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import ALERT_ANALYSIS_WORKFLOW_YAML = require('./security_solution_alert_analysis_workflow.yaml');
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../types';

export const SECURITY_ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';

export interface SecurityAlertAnalysisWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  workflowEnabled: boolean;
  autoCloseEnabled: boolean;
  autoCloseConfidenceScoreMinThreshold: number;
  autoCloseConfidenceScoreMaxThreshold: number;
  connectorId: string;
  createConversation: boolean;
}

const renderAlertAnalysisWorkflowYaml = ({
  workflowEnabled,
  autoCloseEnabled,
  autoCloseConfidenceScoreMinThreshold,
  autoCloseConfidenceScoreMaxThreshold,
  connectorId,
  createConversation,
}: SecurityAlertAnalysisWorkflowTemplateValues): string => {
  const document = parseDocument(ALERT_ANALYSIS_WORKFLOW_YAML);

  document.setIn(['enabled'], workflowEnabled);
  document.setIn(['consts', 'auto_close_enabled'], autoCloseEnabled);
  document.setIn(
    ['consts', 'auto_close_confidence_score_min_threshold'],
    autoCloseConfidenceScoreMinThreshold
  );
  document.setIn(
    ['consts', 'auto_close_confidence_score_max_threshold'],
    autoCloseConfidenceScoreMaxThreshold
  );
  document.setIn(['consts', 'connector_id'], connectorId);
  document.setIn(['consts', 'create_conversation'], createConversation);

  return document.toString();
};

export const SECURITY_ALERT_ANALYSIS_WORKFLOW = {
  id: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 2,
  billable: false,
  visibility: {
    selectors: ['rule_action'],
    solutions: ['security'],
  },
  yamlTemplate: renderAlertAnalysisWorkflowYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'on_adopt',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition<SecurityAlertAnalysisWorkflowTemplateValues>;
