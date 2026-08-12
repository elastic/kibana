/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { JsonObject, VariantName } from '@kbn/workflow-step-schema-cli';
import { VARIANTS } from './types';

/** A compiled variant: the full-document validator for a workflow. */
export interface VariantValidator {
  /** Validator for the whole workflow document. */
  validate: ValidateFunction;
}

/** ajv options for the full-document validator. */
export const AJV_OPTIONS = {
  // The artifact is already generated as valid draft-07, so skip meta-schema
  // self-validation (also avoids runtime meta-schema codegen).
  validateSchema: false,
  // The workflow schema is deeply recursive (nested steps); inlining recursive
  // refs blows the call stack on real workflows.
  inlineRefs: false,
  // The generator ships the `steps`/`triggers` unions with an OpenAPI-style
  // `discriminator`, so ajv validates only the matching branch per step instead
  // of every connector's branch. That keeps a single invalid step from exploding
  // into thousands of errors, so we can report *all* real issues at once.
  allErrors: true,
  // Enable native `discriminator` support (the artifact's step/trigger unions).
  discriminator: true,
  strict: false,
} as const;

/**
 * Compile a variant document into a {@link VariantValidator}. Relies on ajv's
 * native `discriminator` support (enabled in {@link AJV_OPTIONS}); the artifact's
 * `steps`/`triggers` unions carry a `discriminator` keyword so a step is validated
 * only against its `type`'s branch.
 */
export const compileVariant = (doc: JsonObject, variant: VariantName): VariantValidator => {
  // A fresh Ajv per variant keeps their (identically-named) internal refs isolated.
  const ajv = new Ajv(AJV_OPTIONS);
  addFormats(ajv);
  try {
    return { validate: ajv.compile(doc) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to compile the "${variant}" workflow schema. The artifact may be stale or ` +
        `predate native discriminator support. Regenerate it with ` +
        `'node scripts/generate_workflow_step_schemas.js'. Underlying ajv error: ${message}`
    );
  }
};

/** Compile both schema variants into ajv validators. */
export const compileValidators = (
  schemas: Record<VariantName, JsonObject>
): Record<VariantName, VariantValidator> => {
  const validators = {} as Record<VariantName, VariantValidator>;
  for (const variant of VARIANTS) {
    validators[variant] = compileVariant(schemas[variant], variant);
  }
  return validators;
};
