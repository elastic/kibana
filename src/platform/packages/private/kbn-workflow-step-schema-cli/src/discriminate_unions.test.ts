/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformToStrict, transformToTemplate } from './template_transform';
import { isObject, resolveLocalRef, resolveTopLevelUnion } from './schema_helpers';
import type { JsonObject, JsonValue } from './types';

/**
 * Composed-schema shape mirroring the real generator input: `steps`/`triggers`
 * are arrays whose items point to a discriminated union in `definitions`, each
 * union member is a `$ref` to a per-branch definition, and one branch carries an
 * inner parameter also named `type` (noise the transform must not touch).
 */
const composedSchema = (): JsonObject => ({
  type: 'object',
  properties: {
    steps: { type: 'array', items: { $ref: '#/definitions/StepUnion' } },
    triggers: { type: 'array', items: { $ref: '#/definitions/TriggerUnion' } },
  },
  definitions: {
    StepUnion: {
      oneOf: [
        { $ref: '#/definitions/DelayStep' },
        { $ref: '#/definitions/HttpStep' },
        { $ref: '#/definitions/ParallelStep' },
      ],
    },
    DelayStep: {
      type: 'object',
      properties: { type: { type: 'string', const: 'delay' }, seconds: { type: 'number' } },
      required: ['type'],
      additionalProperties: false,
    },
    HttpStep: {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'http' },
        with: {
          type: 'object',
          // A parameter literally named `type` - must remain untouched.
          properties: { type: { enum: ['GET', 'POST'] } },
        },
      },
      required: ['type'],
      additionalProperties: false,
    },
    ParallelStep: {
      type: 'object',
      properties: { type: { type: 'string', const: 'parallel' } },
      required: ['type'],
      additionalProperties: false,
    },
    TriggerUnion: {
      anyOf: [
        {
          type: 'object',
          properties: { type: { type: 'string', const: 'manual' } },
          required: ['type'],
        },
        {
          type: 'object',
          properties: { type: { enum: ['cases.caseCreated', 'cases.caseUpdated'] } },
          required: ['type'],
        },
      ],
    },
  },
});

const asObject = (value: JsonValue | undefined): JsonObject => {
  if (!isObject(value)) {
    throw new Error(`Expected an object, got ${JSON.stringify(value)}`);
  }
  return value;
};

/** Resolve a union member to its concrete definition object (members are `$ref`s). */
const resolveMember = (root: JsonObject, member: JsonValue): JsonObject => {
  const m = asObject(member);
  if (typeof m.$ref === 'string') {
    return asObject(resolveLocalRef(root, m.$ref));
  }
  return m;
};

describe('addUnionDiscriminators (via transformToStrict/transformToTemplate)', () => {
  it('adds a `discriminator` to the steps union and collapses each branch `type` to a bare const', () => {
    const root = transformToStrict(composedSchema());
    const union = asObject(resolveTopLevelUnion(root, 'steps'));

    expect(union.discriminator).toEqual({ propertyName: 'type' });

    const members = (union.oneOf ?? union.anyOf) as JsonValue[];
    const consts = members
      .map((member) => asObject(resolveMember(root, member)))
      .map((branch) => asObject(asObject(branch.properties).type).const);
    expect(consts.sort()).toEqual(['delay', 'http', 'parallel']);
  });

  it('keeps each branch strict: `type` required, bare (no template wrapper) and string-typed', () => {
    const root = transformToStrict(composedSchema());
    const union = asObject(resolveTopLevelUnion(root, 'steps'));
    const members = (union.oneOf ?? union.anyOf) as JsonValue[];

    for (const member of members) {
      const branch = resolveMember(root, member);
      const typeNode = asObject(asObject(branch.properties).type);
      expect(typeNode.anyOf).toBeUndefined();
      expect(typeNode.type).toBe('string');
      expect(typeof typeNode.const).toBe('string');
      expect(branch.required).toContain('type');
    }
  });

  it('does not mistake an inner parameter named `type` for a step discriminator', () => {
    const root = transformToStrict(composedSchema());
    const union = asObject(resolveTopLevelUnion(root, 'steps'));
    const members = (union.oneOf ?? union.anyOf) as JsonValue[];
    const consts = members
      .map((member) => asObject(resolveMember(root, member)))
      .map((branch) => asObject(asObject(branch.properties).type).const);
    // The `with.type` GET/POST parameter of HttpStep must not leak into the tags.
    expect(consts).not.toContain('GET');
    expect(consts).not.toContain('POST');
  });

  it('collapses an enum-typed trigger branch to a bare `enum`', () => {
    const root = transformToStrict(composedSchema());
    const union = asObject(resolveTopLevelUnion(root, 'triggers'));
    expect(union.discriminator).toEqual({ propertyName: 'type' });

    const members = (union.oneOf ?? union.anyOf) as JsonValue[];
    const enumBranch = members
      .map((member) => asObject(resolveMember(root, member)))
      .find((branch) => Array.isArray(asObject(asObject(branch.properties).type).enum));
    expect(asObject(asObject(asObject(enumBranch!).properties).type).enum).toEqual([
      'cases.caseCreated',
      'cases.caseUpdated',
    ]);
  });

  it('applies to the template variant too', () => {
    const root = transformToTemplate(composedSchema());
    const union = asObject(resolveTopLevelUnion(root, 'steps'));
    expect(union.discriminator).toEqual({ propertyName: 'type' });
  });

  it('leaves the union untouched when a branch has no determinable `type` literal', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: { steps: { type: 'array', items: { $ref: '#/definitions/StepUnion' } } },
      definitions: {
        StepUnion: {
          oneOf: [
            { $ref: '#/definitions/Typed' },
            // A stringly step alternative with no `properties.type` - not discriminable.
            { type: 'string' },
          ],
        },
        Typed: {
          type: 'object',
          properties: { type: { type: 'string', const: 'typed' } },
          required: ['type'],
        },
      },
    };
    const root = transformToStrict(schema);
    const union = asObject(resolveTopLevelUnion(root, 'steps'));
    expect(union.discriminator).toBeUndefined();
  });

  it('leaves the union untouched when two branches would map to the same tag', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: { steps: { type: 'array', items: { $ref: '#/definitions/StepUnion' } } },
      definitions: {
        StepUnion: {
          oneOf: [{ $ref: '#/definitions/A' }, { $ref: '#/definitions/B' }],
        },
        A: {
          type: 'object',
          properties: { type: { type: 'string', const: 'dup' } },
          required: ['type'],
        },
        B: {
          type: 'object',
          properties: { type: { type: 'string', const: 'dup' } },
          required: ['type'],
        },
      },
    };
    const root = transformToStrict(schema);
    const union = asObject(resolveTopLevelUnion(root, 'steps'));
    expect(union.discriminator).toBeUndefined();
  });
});
