/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { ContractSpec, SpecSchema } from './types';

// Each spec gets its own Ajv instance, so one fixed id for its document suffices.
const SPEC_ID = 'https://contract-mock.invalid/spec';

const AJV_OPTIONS = {
  allErrors: true,
  allowUnionTypes: true,
  allowMatchingProperties: true,
  // Errors carry their parent schema, so `required` errors for readOnly/writeOnly properties
  // can be dropped in the direction OpenAPI exempts them.
  verbose: true,
  strict: false,
  logger: false,
} as const;

const compilers = new WeakMap<ContractSpec, Ajv>();

const createAjv = ({ document, dialect }: ContractSpec): Ajv => {
  // OpenAPI 3.0 schemas validate as draft-07 once normalization has replaced their
  // draft-04 boolean exclusive bounds; Ajv supports OpenAPI's `nullable` in every draft.
  const ajv = dialect === 'draft-2020-12' ? new Ajv2020(AJV_OPTIONS) : new Ajv(AJV_OPTIONS);
  addFormats(ajv);
  // The document is registered without meta-schema validation, as it is not a schema itself;
  // schemas are compiled in place by pointer, so their refs resolve against the document.
  ajv.addSchema(document, SPEC_ID, undefined, false);
  return ajv;
};

const toFragment = (pointer: string): string =>
  pointer.split('/').map(encodeURIComponent).join('/');

/**
 * Returns the validator for a schema of a spec, compiling it on first use. Validators are
 * cached per spec, so components shared by many operations compile once.
 */
export const getSchemaValidator = (
  spec: ContractSpec,
  { pointer }: SpecSchema
): ValidateFunction => {
  const ajv = compilers.get(spec) ?? createAjv(spec);
  compilers.set(spec, ajv);
  const validate = ajv.getSchema(`${SPEC_ID}#${toFragment(pointer)}`);
  if (!validate) {
    throw new Error(`No schema at ${pointer}`);
  }
  return validate;
};
