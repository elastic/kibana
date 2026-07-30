/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorObject } from 'ajv';
import { validateFile } from './validate_file';
import type { SchemaValidateFn } from './create_schema_validator';

// `validateFile` takes an injected `SchemaValidateFn` (the CLI backs it with a
// worker thread running ajv). Here we stub that boundary with `ErrorObject[]`s
// captured verbatim from a live ajv (discriminator + template-tolerant `anyOf`
// wrappers) and assert the de-noising/anchoring logic. Real compilation +
// deep-nesting behavior are covered by the generator test and the live run.
const passFn: SchemaValidateFn = async () => ({ errors: [], overflowed: false });

const failFn =
  (errors: ErrorObject[]): SchemaValidateFn =>
  async () => ({ errors, overflowed: false });

const overflowFn: SchemaValidateFn = async () => ({ errors: [], overflowed: true });

const schemaIssuesOf = (result: { issues: Array<{ source: string }> }) =>
  result.issues.filter((issue) => issue.source === 'schema');

/** The tolerant `steps` `anyOf` wrapper noise that fires alongside any deeper step error. */
const STEPS_WRAPPER_NOISE: ErrorObject[] = [
  {
    instancePath: '/steps',
    schemaPath: '#/type',
    keyword: 'type',
    params: { type: 'string' },
    message: 'must be string',
  },
  {
    instancePath: '/steps',
    schemaPath: '#/properties/steps/anyOf',
    keyword: 'anyOf',
    params: {},
    message: 'must match a schema in anyOf',
  },
] as ErrorObject[];

const VALID_METADATA = `template-metadata:
  slug: my-template
  version: 1.0.0
  availability: ">=9.5.0"
  name: My Template
  description: Does useful things
  categories:
    - ops
`;

describe('validateFile', () => {
  it('passes a valid plain workflow against the strict variant (auto)', async () => {
    const result = await validateFile({
      yaml: `version: "1"\nsteps: []\n`,
      validateSchema: passFn,
      variantMode: 'auto',
    });
    expect(result.issues).toEqual([]);
    expect(result.schemaPassed).toBe(true);
    expect(result.isTemplate).toBe(false);
    expect(result.variant).toBe('strict');
  });

  it('reports schema issues for an invalid plain workflow', async () => {
    const validateSchema = failFn([
      {
        instancePath: '',
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'version' },
        message: "must have required property 'version'",
      },
    ] as ErrorObject[]);
    const result = await validateFile({ yaml: `steps: []\n`, validateSchema, variantMode: 'auto' });
    expect(result.schemaPassed).toBe(false);
    expect(schemaIssuesOf(result)).toEqual([
      { source: 'schema', path: '<root>', message: "must have required property 'version'" },
    ]);
  });

  it('validates and strips template-metadata for a template (auto -> template variant)', async () => {
    const yaml = `${VALID_METADATA}version: "1"\nsteps: []\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'auto' });
    expect(result.isTemplate).toBe(true);
    expect(result.variant).toBe('template');
    expect(result.issues).toEqual([]);
    expect(result.body).not.toHaveProperty('template-metadata');
  });

  it('reports metadata issues for a template with an invalid metadata block', async () => {
    const yaml = `template-metadata:\n  slug: Invalid_Slug\nversion: "1"\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'auto' });
    expect(result.isTemplate).toBe(true);
    expect(result.issues.some((issue) => issue.source === 'metadata')).toBe(true);
  });

  it('honors a forced --variant while still stripping template metadata', async () => {
    const yaml = `${VALID_METADATA}version: "1"\nsteps: []\n`;
    const result = await validateFile({ yaml, validateSchema: passFn, variantMode: 'strict' });
    expect(result.isTemplate).toBe(true);
    expect(result.variant).toBe('strict');
    expect(result.issues).toEqual([]);
  });

  it('reports a yaml-syntax issue for malformed YAML', async () => {
    const result = await validateFile({
      yaml: `version: "1"\n  bad: : :\n`,
      validateSchema: passFn,
      variantMode: 'auto',
    });
    expect(result.schemaPassed).toBe(false);
    expect(result.issues.some((issue) => issue.source === 'yaml-syntax')).toBe(true);
  });

  it('reports a deep-nesting issue when validation overflows the stack', async () => {
    const result = await validateFile({
      yaml: `version: "1"\nsteps: []\n`,
      validateSchema: overflowFn,
      variantMode: 'strict',
    });
    expect(result.schemaPassed).toBe(false);
    expect(schemaIssuesOf(result)).toEqual([
      {
        source: 'schema',
        path: '<root>',
        message: 'Schema validation could not complete (document too deeply nested for the schema)',
      },
    ]);
  });

  describe('discriminator-anchored schema errors', () => {
    it('anchors an additional-property error to the step and names the offending key', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });

    it('flags an unknown step type without dumping the whole step union', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0',
          schemaPath: '#/discriminator',
          keyword: 'discriminator',
          params: { error: 'mapping', tag: 'type', tagValue: 'totally.unknown' },
          message: 'value of tag "type" must be in oneOf',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        { source: 'schema', path: 'steps.0.type', message: 'unknown step type "totally.unknown"' },
      ]);
    });

    it('prunes template-value branch noise from a property (with:) error', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/properties/with/anyOf/0/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'timeout' },
          message: 'must NOT have additional properties',
        },
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        },
        {
          instancePath: '/steps/0/with',
          schemaPath: '#/properties/with/anyOf',
          keyword: 'anyOf',
          params: {},
          message: 'must match a schema in anyOf',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.with',
          message: "must NOT have additional property 'timeout'",
        },
      ]);
    });

    it('anchors an error inside a nested step and prunes ancestor wrapper noise', async () => {
      const validateSchema = failFn([
        {
          instancePath: '/steps/0/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `version: "1"\nsteps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        {
          source: 'schema',
          path: 'steps.0.steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });

    it('keeps root-level errors while anchoring step errors', async () => {
      const validateSchema = failFn([
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'version' },
          message: "must have required property 'version'",
        },
        {
          instancePath: '/steps/0',
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: 'connector-id' },
          message: 'must NOT have additional properties',
        },
        ...STEPS_WRAPPER_NOISE,
      ] as ErrorObject[]);
      const result = await validateFile({
        yaml: `steps: []\n`,
        validateSchema,
        variantMode: 'strict',
      });
      expect(schemaIssuesOf(result)).toEqual([
        { source: 'schema', path: '<root>', message: "must have required property 'version'" },
        {
          source: 'schema',
          path: 'steps.0',
          message: "must NOT have additional property 'connector-id'",
        },
      ]);
    });
  });
});
