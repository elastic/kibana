/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  parseWorkflowYamlToJSON,
} from '@kbn/workflows-yaml';

export type ValidationOutcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'oversize'; readonly bytes: number; readonly limit: number }
  | { readonly kind: 'syntax-error'; readonly message: string }
  | { readonly kind: 'schema-error'; readonly issues: readonly SchemaIssue[] }
  | { readonly kind: 'unexpected-error'; readonly message: string };

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

export function validateExampleYaml(yaml: string, schema: z.ZodType): ValidationOutcome {
  const bytes = Buffer.byteLength(yaml, 'utf8');
  if (bytes > MAX_WORKFLOW_YAML_LENGTH) {
    return { kind: 'oversize', bytes, limit: MAX_WORKFLOW_YAML_LENGTH };
  }

  const result = parseWorkflowYamlToJSON(yaml, schema);

  if (result.success) {
    return { kind: 'ok' };
  }

  const { error } = result;
  if (error instanceof InvalidYamlSyntaxError) {
    return { kind: 'syntax-error', message: error.message };
  }
  if (error instanceof InvalidYamlSchemaError) {
    const issues = (error.formattedZodError?.issues ?? []).map((issue) => ({
      path: issue.path.map(String).join('.') || '<root>',
      message: issue.message,
    }));
    if (issues.length === 0) {
      issues.push({ path: '<root>', message: error.message });
    }
    return { kind: 'schema-error', issues };
  }
  return { kind: 'unexpected-error', message: error.message };
}
