/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceIdItem, YamlValidationResult } from '../model/types';

export interface InferenceEndpoint {
  id: string;
  name: string;
  service: string;
  task_type: string;
}

export function validateInferenceIds(
  inferenceIdItems: InferenceIdItem[],
  inferenceEndpoints: InferenceEndpoint[] | null
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  if (!inferenceEndpoints) {
    return [];
  }

  // Filter out template variables like ${{vars.inference_id}}
  const notReferenceInferenceIds = inferenceIdItems.filter(
    (item) => !item.key?.startsWith('${{') || !item.key.endsWith('}}')
  );

  for (const inferenceIdItem of notReferenceInferenceIds) {
    const endpoint = inferenceEndpoints.find(
      (ep) => ep.id === inferenceIdItem.key || ep.name === inferenceIdItem.key
    );

    if (!endpoint) {
      const availableIds = inferenceEndpoints.map((ep) => ep.id).join(', ');
      const errorMessage = availableIds
        ? `Inference endpoint "${inferenceIdItem.key}" not found. Available endpoints: ${availableIds}`
        : `Inference endpoint "${inferenceIdItem.key}" not found. No rerank endpoints are configured.`;

      results.push({
        id: inferenceIdItem.id,
        severity: 'error',
        message: errorMessage,
        owner: 'inference-id-validation',
        startLineNumber: inferenceIdItem.startLineNumber,
        startColumn: inferenceIdItem.startColumn,
        endLineNumber: inferenceIdItem.endLineNumber,
        endColumn: inferenceIdItem.endColumn,
        afterMessage: null,
        hoverMessage: null,
      });
    } else {
      results.push({
        id: inferenceIdItem.id,
        severity: null,
        message: null,
        owner: 'inference-id-validation',
        startLineNumber: inferenceIdItem.startLineNumber,
        startColumn: inferenceIdItem.startColumn,
        endLineNumber: inferenceIdItem.endLineNumber,
        endColumn: inferenceIdItem.endColumn,
        afterMessage: `✓ (${endpoint.service} rerank endpoint, ID: ${endpoint.id})`,
        hoverMessage: null,
      });
    }
  }

  return results;
}
