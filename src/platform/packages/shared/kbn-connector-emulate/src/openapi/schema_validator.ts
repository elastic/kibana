/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OutputUnit, Schema, SchemaDraft } from '@cfworker/json-schema';
import { validate } from '@cfworker/json-schema';
import { getAtPointer } from './json_pointer';
import { isRecord, walkSchema } from './schema_walk';
import type { ContractSpec, SchemaDialect, SpecSchema } from './types';

/** Lists the errors of a value against a schema; empty when the value is valid. */
export type SchemaValidator = (value: unknown) => readonly OutputUnit[];

const DRAFTS: Record<SchemaDialect, SchemaDraft> = {
  'openapi-3.0': '7',
  'draft-2020-12': '2020-12',
};

interface SpecRefs {
  readonly lookup: Record<string, Schema | boolean>;
  readonly seen: WeakSet<object>;
}

const refsBySpec = new WeakMap<ContractSpec, SpecRefs>();

/** Returns the schema a `$ref` within the spec's document points at, if any. */
export const resolveSchemaRef = (
  { document }: ContractSpec,
  ref: string
): Schema | boolean | undefined => {
  if (!ref.startsWith('#')) {
    return undefined;
  }
  let pointer: string;
  try {
    pointer = decodeURIComponent(ref.slice(1));
  } catch {
    return undefined;
  }
  const target = getAtPointer(document, pointer);
  return isRecord(target) || typeof target === 'boolean' ? target : undefined;
};

// cfworker resolves a `$ref` by looking up its literal value, so each spec keeps a lookup of
// every ref reachable from the schemas validated so far.
const collectRefs = (spec: ContractSpec, schema: unknown): SpecRefs['lookup'] => {
  const refs = refsBySpec.get(spec) ?? { lookup: {}, seen: new WeakSet<object>() };
  refsBySpec.set(spec, refs);
  walkSchema(schema, () => {}, {
    seen: refs.seen,
    resolveRef: (ref) => {
      const target = resolveSchemaRef(spec, ref);
      if (target !== undefined) {
        refs.lookup[ref] = target;
      }
      return target;
    },
  });
  return refs.lookup;
};

/**
 * Returns a validator for a schema of a spec, in the spec's dialect. The schema is validated in
 * place, so its refs resolve against the spec document.
 */
export const getSchemaValidator = (spec: ContractSpec, { schema }: SpecSchema): SchemaValidator => {
  const lookup = collectRefs(spec, schema);
  const draft = DRAFTS[spec.dialect];
  return (value) => validate(value, schema, draft, lookup, false).errors;
};
