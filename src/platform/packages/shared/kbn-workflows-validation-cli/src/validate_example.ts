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
  isDynamicValue,
  isInstallValue,
  isLiquidTagValue,
  isVariableValue,
  parseWorkflowYamlToJSON,
} from '@kbn/workflows-yaml';
import { detectTemplateSafe, validateTemplateMetadata } from './template_schema';

export type ValidationMode = 'auto' | 'template' | 'plain';

export type ValidationOutcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'oversize'; readonly bytes: number; readonly limit: number }
  | { readonly kind: 'syntax-error'; readonly message: string }
  | { readonly kind: 'schema-error'; readonly issues: readonly SchemaIssue[] }
  | {
      readonly kind: 'wrong-type';
      readonly expected: 'template' | 'plain';
      readonly message: string;
    }
  | { readonly kind: 'unexpected-error'; readonly message: string };

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

export const validateExampleYaml = (
  yaml: string,
  schema: z.ZodType,
  mode: ValidationMode = 'auto'
): ValidationOutcome => {
  const bytes = Buffer.byteLength(yaml, 'utf8');
  if (bytes > MAX_WORKFLOW_YAML_LENGTH) {
    return { kind: 'oversize', bytes, limit: MAX_WORKFLOW_YAML_LENGTH };
  }

  // Check for YAML syntax errors before any mode-specific logic, so a bad YAML
  // file always reports `syntax-error` rather than a misleading `wrong-type`.
  const { isTemplate, syntaxError, doc } = detectTemplateSafe(yaml);
  if (syntaxError !== null) {
    return { kind: 'syntax-error', message: syntaxError };
  }

  const effectiveMode = mode === 'auto' ? (isTemplate ? 'template' : 'plain') : mode;

  if (effectiveMode === 'plain' && isTemplate) {
    return {
      kind: 'wrong-type',
      expected: 'plain',
      message: 'File contains a `template-metadata` block but --plain was requested.',
    };
  }
  if (effectiveMode === 'template' && !isTemplate) {
    return {
      kind: 'wrong-type',
      expected: 'template',
      message: 'File has no `template-metadata` block but --template was requested.',
    };
  }

  if (effectiveMode === 'template') {
    return validateAsTemplate(yaml, schema, doc);
  }
  return validateAsPlain(yaml, schema);
};

/**
 * Returns a shallow copy of `doc` with the `template-metadata` root key removed.
 * Used so template body validation sees only the workflow fields, regardless of
 * whether the schema is strict or loose.
 */
const stripTemplateMetadata = (doc: unknown): unknown => {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    return doc;
  }
  const { ['template-metadata']: _metadata, ...rest } = doc as Record<string, unknown>;
  return rest;
};

/**
 * Validates a pre-parsed JSON document against `schema`, applying the same
 * dynamic-value suppression as `parseWorkflowYamlToJSON` (Liquid expressions,
 * install-time placeholders, and `${{ }}` dynamic refs are never flagged as
 * schema errors). Used for template body validation where the YAML has already
 * been parsed and `template-metadata` has been stripped.
 */
const validateDocAsPlain = (doc: unknown, schema: z.ZodType): ValidationOutcome => {
  const result = schema.safeParse(doc);
  if (result.success) {
    return { kind: 'ok' };
  }

  // Mirror the dynamic-value filter in parseWorkflowYamlToJSON.
  const filteredIssues = result.error.issues.filter((issue) => {
    if (!issue.path || issue.path.length === 0) {
      return true;
    }
    let value: unknown = doc;
    for (const segment of issue.path) {
      if (value == null || typeof value !== 'object') {
        return true;
      }
      value = (value as Record<string, unknown>)[segment as string];
    }
    return !(
      isDynamicValue(value) ||
      isVariableValue(value) ||
      isLiquidTagValue(value) ||
      isInstallValue(value)
    );
  });

  if (filteredIssues.length === 0) {
    return { kind: 'ok' };
  }

  const issues = filteredIssues.map((issue) => ({
    path: issue.path.map(String).join('.') || '<root>',
    message: issue.message,
  }));
  return { kind: 'schema-error', issues };
};

const validateAsPlain = (yaml: string, schema: z.ZodType): ValidationOutcome => {
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
};

const validateAsTemplate = (yaml: string, schema: z.ZodType, doc: unknown): ValidationOutcome => {
  // Strip `template-metadata` before body validation so the key never reaches the
  // schema — necessary for strict schemas (loose=false) which reject unknown keys,
  // and harmless for loose schemas. Metadata is validated separately below.
  //
  // We use validateDocAsPlain on the pre-parsed doc rather than calling
  // validateAsPlain(yaml, schema) which would re-parse and include template-metadata.
  // YAML syntax is already confirmed valid by detectTemplateSafe.
  const strippedDoc = stripTemplateMetadata(doc);
  const bodyOutcome = validateDocAsPlain(strippedDoc, schema);
  if (bodyOutcome.kind === 'syntax-error' || bodyOutcome.kind === 'unexpected-error') {
    return bodyOutcome;
  }

  const bodyIssues: readonly SchemaIssue[] =
    bodyOutcome.kind === 'schema-error' ? bodyOutcome.issues : [];

  const metadataIssues = validateTemplateMetadata(doc);

  const allIssues = [...bodyIssues, ...metadataIssues];
  if (allIssues.length > 0) {
    return { kind: 'schema-error', issues: allIssues };
  }
  return { kind: 'ok' };
};
