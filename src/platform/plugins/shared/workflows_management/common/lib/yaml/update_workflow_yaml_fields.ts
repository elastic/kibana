/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflow } from '@kbn/workflows';
import { updateYamlField } from '@kbn/workflows-yaml';
import { parseDocument } from 'yaml';

/**
 * Checks if a workflow update affects YAML metadata fields
 * (enabled, name, description, tags) that require YAML synchronization.
 */
export function affectsYamlMetadata(workflow: Partial<EsWorkflow>): boolean {
  return (
    workflow.enabled !== undefined ||
    workflow.name !== undefined ||
    workflow.description !== undefined ||
    workflow.tags !== undefined
  );
}

const deleteYamlField = (yamlString: string, fieldPath: string): string => {
  try {
    const doc = parseDocument(yamlString);
    const pathArray = fieldPath.split('.');
    if (!doc.hasIn(pathArray)) {
      return yamlString;
    }
    doc.deleteIn(pathArray);
    return doc.toString();
  } catch {
    return yamlString;
  }
};

/**
 * Updates multiple YAML fields in a workflow YAML string while preserving formatting.
 * This is a convenience function that applies multiple field updates in sequence.
 *
 * Empty optional metadata (`description: ''`, `tags: []`) removes the key from the
 * document — empty optional keys must not linger in YAML.
 *
 * @param yamlString - The original YAML string
 * @param workflow - The workflow update object containing fields to update
 * @param enabledValue - The resolved enabled value (may differ from workflow.enabled due to validation)
 * @returns The updated YAML string with all fields updated
 */
export function updateWorkflowYamlFields(
  yamlString: string,
  workflow: Partial<EsWorkflow>,
  enabledValue?: boolean
): string {
  let updatedYaml = yamlString;

  if (workflow.name !== undefined) {
    updatedYaml = updateYamlField(updatedYaml, 'name', workflow.name);
  }
  if (workflow.enabled !== undefined && enabledValue !== undefined) {
    updatedYaml = updateYamlField(updatedYaml, 'enabled', enabledValue);
  }
  if (workflow.description !== undefined) {
    updatedYaml =
      workflow.description === ''
        ? deleteYamlField(updatedYaml, 'description')
        : updateYamlField(updatedYaml, 'description', workflow.description);
  }
  if (workflow.tags !== undefined) {
    updatedYaml =
      workflow.tags.length === 0
        ? deleteYamlField(updatedYaml, 'tags')
        : updateYamlField(updatedYaml, 'tags', workflow.tags);
  }

  return updatedYaml;
}
