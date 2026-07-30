/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateFile } from './validate_file';
import { validateSemantics } from './validate_semantics';
import { validateLiquid } from './validate_liquid';
import type { SchemaValidateFn } from './create_schema_validator';
import type { ValidationIssue, ValidationOutcome, VariantMode } from './types';

export interface ValidateWorkflowYamlInput {
  /** Path used only for reporting. */
  file: string;
  yaml: string;
  /** Injected schema validator (the CLI backs this with a worker thread). */
  validateSchema: SchemaValidateFn;
  variantMode: VariantMode;
}

/**
 * Run all three validation layers for one file and merge their issues:
 * 1. JSON Schema (+ template metadata) — always.
 * 2. Semantic (step-name uniqueness + DAG) — only when the schema layer passed.
 * 3. LiquidJS syntax — always.
 */
export const validateWorkflowYaml = async ({
  file,
  yaml,
  validateSchema,
  variantMode,
}: ValidateWorkflowYamlInput): Promise<ValidationOutcome> => {
  const schemaResult = await validateFile({ yaml, validateSchema, variantMode });
  const issues: ValidationIssue[] = [...schemaResult.issues];

  if (schemaResult.schemaPassed && schemaResult.body) {
    issues.push(...validateSemantics(schemaResult.body));
  }

  issues.push(...validateLiquid(yaml, schemaResult.document));

  return {
    file,
    ok: issues.length === 0,
    isTemplate: schemaResult.isTemplate,
    variant: schemaResult.variant,
    issues,
  };
};
