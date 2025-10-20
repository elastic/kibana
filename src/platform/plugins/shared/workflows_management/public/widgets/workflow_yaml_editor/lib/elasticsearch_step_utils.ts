/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any, complexity */

import { isMap, isPair, isScalar, visit } from 'yaml';
import type YAML from 'yaml';
import type { monaco } from '@kbn/monaco';
import { buildRequestFromConnector } from '@kbn/workflows';

export interface ElasticsearchStepData {
  type: string;
  method: string;
  url: string;
  data?: string[];
  stepNode: any;
  typeNode: any;
}

/**
 * Checks if a workflow step type starts with 'elasticsearch'
 * Accepts undefined or null as input.
 */
export function isElasticsearchStep(stepType: string | undefined | null): boolean {
  return typeof stepType === 'string' && stepType.startsWith('elasticsearch');
}

/**
 * Converts an Elasticsearch step type to HTTP method and URL using the EXACT same logic as the execution engine
 */
export function getElasticsearchRequestInfo(
  stepType: string,
  withParams?: Record<string, any>
): {
  method: string;
  url: string;
  data?: string[];
} {
  // Import and reuse the EXACT same logic as ElasticsearchActionStepImpl
  const { method, path, body } = buildRequestFromConnector(stepType, withParams || {});

  return {
    method,
    url: path,
    data: body ? [JSON.stringify(body, null, 2)] : undefined,
  };
}

/**
 * Extracts Elasticsearch step information from a YAML document
 */
export function getElasticsearchSteps(yamlDocument: YAML.Document): ElasticsearchStepData[] {
  const elasticsearchSteps: ElasticsearchStepData[] = [];

  if (!yamlDocument?.contents) {
    // console.log('getElasticsearchSteps: No document contents');
    return elasticsearchSteps;
  }

  // console.log('getElasticsearchSteps: Starting YAML visit');

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // console.log('getElasticsearchSteps: Found type pair', pair.value);

      // Check if this is a type field within a step
      const path = ancestors.slice();
      let isStepType = false;

      // Walk up the ancestors to see if we're in a steps array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'steps') {
          isStepType = true;
          break;
        }
      }

      // console.log('getElasticsearchSteps: isStepType', isStepType);

      if (isStepType && isScalar(pair.value)) {
        const stepType = pair.value.value as string;
        // console.log('getElasticsearchSteps: Found step type', stepType);

        if (isElasticsearchStep(stepType)) {
          // console.log('getElasticsearchSteps: Is Elasticsearch step', stepType);
          // Find the parent step node that contains this type
          const stepNode = ancestors[ancestors.length - 1];

          // Extract 'with' parameters from the step
          let withParams: Record<string, any> = {};
          if (stepNode && isMap(stepNode)) {
            for (const item of stepNode.items) {
              if (isPair(item) && isScalar(item.key) && item.key.value === 'with') {
                if (item.value && isMap(item.value)) {
                  withParams = {};
                  for (const withItem of item.value.items) {
                    if (isPair(withItem) && isScalar(withItem.key)) {
                      const paramKey = withItem.key.value as string;
                      // Handle both scalar values and nested objects
                      if (isScalar(withItem.value)) {
                        withParams[paramKey] = withItem.value.value;
                      } else {
                        // For nested objects (like query), convert the YAML node to a JS object
                        withParams[paramKey] =
                          (withItem.value as any)?.toJSON?.() || withItem.value;
                      }
                    }
                  }
                }
                break;
              }
            }
          }

          // console.log('getElasticsearchSteps: With params', withParams);

          const requestInfo = getElasticsearchRequestInfo(stepType, withParams);

          // console.log('getElasticsearchSteps: Request info', requestInfo);

          elasticsearchSteps.push({
            type: stepType,
            method: requestInfo.method,
            url: requestInfo.url,
            data: requestInfo.data,
            stepNode,
            typeNode: pair,
          });
        }
      }
    },
  });

  // console.log('getElasticsearchSteps: Found', elasticsearchSteps.length, 'elasticsearch steps');
  return elasticsearchSteps;
}

/**
 * Finds an Elasticsearch step at a specific Monaco position
 */
export function findElasticsearchStepAtPosition(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  yamlDocument: YAML.Document
): ElasticsearchStepData | null {
  const elasticsearchSteps = getElasticsearchSteps(yamlDocument);

  /*
  console.log(
    'findElasticsearchStepAtPosition: Found',
    elasticsearchSteps.length,
    'elasticsearch steps'
  );
  */

  const offset = model.getOffsetAt(position);
  // console.log('findElasticsearchStepAtPosition: Position offset', offset);

  for (const step of elasticsearchSteps) {
    // Check if the position is within the step node range
    const stepRange = step.stepNode.range;
    // console.log('findElasticsearchStepAtPosition: Checking step', step.type, 'range', stepRange);
    if (stepRange && offset >= stepRange[0] && offset <= stepRange[1]) {
      // console.log('findElasticsearchStepAtPosition: Found matching step', step);
      return step;
    }
  }

  // console.log('findElasticsearchStepAtPosition: No matching step found');
  return null;
}

/**
 * Converts workflow step data to Console-compatible request format
 */
export function stepToConsoleRequest(step: ElasticsearchStepData): {
  method: string;
  url: string;
  data: string[];
} {
  return {
    method: step.method,
    url: step.url,
    data: step.data || [],
  };
}

/**
 * Converts an Elasticsearch workflow step to Console format string
 */
export function getConsoleFormat(step: ElasticsearchStepData): string {
  const request = stepToConsoleRequest(step);

  let consoleFormat = `${request.method} ${request.url}`;

  if (request.data && request.data.length > 0) {
    consoleFormat += `\n${request.data.join('\n')}`;
  }

  return consoleFormat;
}
