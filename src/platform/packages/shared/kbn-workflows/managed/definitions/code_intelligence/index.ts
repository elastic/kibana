/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import CLASSIFY_LOGGING_CANDIDATES_YAML from './classify_logging_candidates.yaml';
import CLASSIFY_OTEL_CANDIDATES_YAML from './classify_otel_candidates.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID =
  'system-code-intelligence-classify-logging-candidates';
export const CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID =
  'system-code-intelligence-classify-otel-candidates';

export interface CodeIntelligenceClassificationWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  connectorId: string;
}

// A JSON string is a valid YAML double-quoted scalar, so any connector id renders safely.
const renderTemplate = (template: string, { connectorId }: { connectorId: string }): string =>
  template.split('__CONNECTOR_ID__').join(JSON.stringify(connectorId));

const MANAGEMENT = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

export const CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW = {
  id: CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID,
  pluginId: 'codeIntelligence',
  version: 7,
  billable: true,
  yamlTemplate: ({ connectorId }) =>
    renderTemplate(CLASSIFY_LOGGING_CANDIDATES_YAML, { connectorId }),
  management: MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<CodeIntelligenceClassificationWorkflowTemplateValues>;

export const CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW = {
  id: CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID,
  pluginId: 'codeIntelligence',
  version: 6,
  billable: true,
  yamlTemplate: ({ connectorId }) => renderTemplate(CLASSIFY_OTEL_CANDIDATES_YAML, { connectorId }),
  management: MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<CodeIntelligenceClassificationWorkflowTemplateValues>;
