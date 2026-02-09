/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import { findBracketDottedKeyUsages } from '../../../widgets/workflow_yaml_editor/lib/alert_trigger_bracket_key_usage';
import type { YamlValidationResult } from '../model/types';

/**
 * Returns a syntax warning for each occurrence of bracket notation with dotted keys
 * (e.g. event.alerts[0]['kibana.alert.rule.name']) when the workflow has an alert trigger.
 * Each warning points to the exact position of the offending usage.
 */
export function validateAlertBracketKeyUsage(
  yamlContent: string,
  workflowDefinition: WorkflowYaml | null | undefined
): YamlValidationResult[] {
  if (!workflowDefinition?.triggers?.some((t) => t.type === 'alert')) {
    return [];
  }

  const matches = findBracketDottedKeyUsages(yamlContent);
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const message = i18n.translate(
      'workflows.yamlEditor.alertTriggerBracketKeyWarning.validationMessage',
      {
        defaultMessage:
          'Deprecated: {bracketKey} uses bracket notation with dotted keys. Prefer dot notation (e.g. .kibana.alert.rule.name) for alert triggers.',
        values: { bracketKey: match.text },
      }
    );
    return {
      id: `alert-bracket-key-syntax-${index}`,
      startLineNumber: match.lineNumber,
      startColumn: match.startColumn,
      endLineNumber: match.lineNumber,
      endColumn: match.endColumn,
      severity: 'warning' as const,
      message,
      owner: 'alert-bracket-key-validation' as const,
      hoverMessage: message,
    };
  });
}
