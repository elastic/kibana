/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../type_guards';
import { parseYamlToJSONWithoutValidation } from '../yaml/parse_workflow_yaml_to_json_without_validation';

export interface WorkflowPreview {
  id: string;
  name: string | null;
  description: string | null;
  triggers: Array<{ type: string }>;
  inputCount: number;
  stepCount: number;
  valid: boolean;
}

function extractTriggers(raw: unknown): Array<{ type: string }> {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((t): t is { type: string } => isRecord(t) && typeof t.type === 'string')
    .map((t) => ({ type: t.type }));
}

function countInputs(raw: unknown): number {
  if (Array.isArray(raw)) {
    return raw.length;
  }
  if (isRecord(raw) && 'properties' in raw) {
    const props = raw.properties;
    if (isRecord(props)) {
      return Object.keys(props).length;
    }
  }
  return 0;
}

/**
 * Extracts lightweight preview metadata from a raw workflow YAML string.
 * Uses unvalidated parsing so that even partially-valid YAML produces
 * whatever metadata is available.
 */
export function extractWorkflowPreview(id: string, yaml: string): WorkflowPreview {
  const result = parseYamlToJSONWithoutValidation(yaml);

  if (!result.success || result.json == null || typeof result.json !== 'object') {
    return {
      id,
      name: null,
      description: null,
      triggers: [],
      inputCount: 0,
      stepCount: 0,
      valid: false,
    };
  }

  const json = result.json;
  const name = typeof json.name === 'string' ? json.name : null;
  const description = typeof json.description === 'string' ? json.description : null;
  const triggers = extractTriggers(json.triggers);
  const inputCount = countInputs(json.inputs);
  const stepCount = Array.isArray(json.steps) ? json.steps.length : 0;

  return { id, name, description, triggers, inputCount, stepCount, valid: true };
}
