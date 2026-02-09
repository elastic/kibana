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
import { hasBracketDottedKeyUsage } from '../../../widgets/workflow_yaml_editor/lib/alert_trigger_bracket_key_usage';
import type { YamlValidationResult } from '../model/types';

/**
 * Returns a syntax warning when the workflow has an alert trigger and uses
 * bracket notation with dotted keys in variables (e.g. event.alerts[0]['kibana.alert.rule.name']).
 * Prefer dot notation (e.g. event.alerts[0].kibana.alert.rule.name) for better compatibility.
 */
export function validateAlertBracketKeyUsage(
  yamlContent: string,
  workflowDefinition: WorkflowYaml | null | undefined
): YamlValidationResult[] {
  if (!workflowDefinition?.triggers?.some((t) => t.type === 'alert')) {
    return [];
  }
  if (!hasBracketDottedKeyUsage(yamlContent)) {
    return [];
  }
  const message = i18n.translate(
    'workflows.yamlEditor.alertTriggerBracketKeyWarning.validationMessage',
    {
      defaultMessage:
        "Deprecated: variables use bracket notation with dotted keys (e.g. ['kibana.alert.rule.name']). Prefer dot notation (e.g. .kibana.alert.rule.name) for alert triggers.",
    }
  );
  return [
    {
      id: 'alert-bracket-key-syntax',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
      severity: 'warning',
      message,
      owner: 'alert-bracket-key-validation',
      hoverMessage: message,
    },
  ];
}
