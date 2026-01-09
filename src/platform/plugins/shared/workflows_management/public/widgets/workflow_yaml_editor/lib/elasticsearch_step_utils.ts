/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scalar, YAMLMap } from 'yaml';
import { buildRequestFromConnector } from '@kbn/workflows';

export interface ElasticsearchStepData {
  type: string;
  method: string;
  url: string;
  data?: string[];
  stepNode: YAMLMap;
  typeNode: Scalar<string>;
}

export interface ElasticsearchRequestInfo {
  method: string;
  url: string;
  data?: string[];
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
  withParams?: Record<string, unknown>
): ElasticsearchRequestInfo {
  // Import and reuse the EXACT same logic as ElasticsearchActionStepImpl
  const { method, path, body } = buildRequestFromConnector(stepType, withParams || {});

  return {
    method,
    url: decodeURIComponent(path),
    data: body ? [JSON.stringify(body, null, 2)] : undefined,
  };
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
