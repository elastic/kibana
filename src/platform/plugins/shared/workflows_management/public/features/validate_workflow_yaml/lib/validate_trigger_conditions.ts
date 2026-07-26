/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { collectTriggerConditionItems } from './collect_trigger_condition_items';
import { validateTriggerConditionsForWorkflow } from '../../../../common/lib/validate_triggers';
import { triggerSchemas } from '../../../trigger_schemas';
import type { YamlValidationResult } from '../model/types';

/**
 * Validates custom trigger conditions and returns editor-ready results with line/column.
 * Delegates to validateTriggerConditionsForWorkflow (common) for the rules; uses the YAML
 * document only to attach positions so the editor can paint squiggles.
 *
 */
export function validateTriggerConditions(
  workflow: WorkflowYaml,
  yamlDocument: Document
): YamlValidationResult[] {
  const { errors } = validateTriggerConditionsForWorkflow(workflow, (id) =>
    triggerSchemas.getTriggerDefinition(id)
  );
  if (errors.length === 0) {
    return [];
  }

  const itemsByIndex = new Map(
    collectTriggerConditionItems(yamlDocument).map((item) => [item.triggerIndex, item])
  );

  return errors.map((err) => {
    const item = itemsByIndex.get(err.triggerIndex);
    return {
      id: `trigger-condition-${err.triggerIndex}-${item?.startLineNumber ?? 0}-${
        item?.startColumn ?? 0
      }`,
      owner: 'trigger-condition-validation' as const,
      message: err.message,
      startLineNumber: item?.startLineNumber ?? 1,
      startColumn: item?.startColumn ?? 1,
      endLineNumber: item?.endLineNumber ?? 1,
      endColumn: item?.endColumn ?? 1,
      severity: 'error' as const,
      hoverMessage: err.message,
    };
  });
}
