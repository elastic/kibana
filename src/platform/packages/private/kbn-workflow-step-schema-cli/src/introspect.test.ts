/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractStepTypes, extractTriggerTypes } from './introspect';
import { transformToTemplate } from './template_transform';
import type { JsonObject } from './types';

/**
 * Minimal composed-schema shape: `steps`/`triggers` are arrays whose items point
 * to a discriminated union in `definitions`. One step branch carries an inner
 * parameter named `type` to prove parameter subtrees are NOT mistaken for
 * step discriminators.
 */
const composedSchema: JsonObject = {
  type: 'object',
  properties: {
    steps: { type: 'array', items: { $ref: '#/definitions/StepUnion' } },
    triggers: { type: 'array', minItems: 1, items: { $ref: '#/definitions/TriggerUnion' } },
  },
  definitions: {
    StepUnion: {
      oneOf: [
        { $ref: '#/definitions/IfStep' },
        { $ref: '#/definitions/CreateCaseStep' },
        { $ref: '#/definitions/SlackStep' },
      ],
    },
    IfStep: {
      type: 'object',
      properties: {
        type: { const: 'if' },
        // Nested steps reference the same union - must not cause infinite recursion.
        steps: { type: 'array', items: { $ref: '#/definitions/StepUnion' } },
      },
    },
    CreateCaseStep: {
      type: 'object',
      properties: {
        type: { const: 'cases.createCase' },
        with: {
          type: 'object',
          properties: {
            // A parameter literally named `type` - noise that must be ignored.
            type: { enum: ['security', 'observability'] },
          },
        },
      },
    },
    SlackStep: {
      type: 'object',
      properties: {
        type: { const: 'slack' },
      },
    },
    TriggerUnion: {
      anyOf: [
        {
          type: 'object',
          properties: { type: { const: 'manual' } },
        },
        {
          type: 'object',
          properties: { type: { enum: ['cases.caseCreated', 'cases.caseUpdated'] } },
        },
      ],
    },
  },
};

describe('extractStepTypes / extractTriggerTypes', () => {
  it('collects union discriminators, sorted and de-duplicated', () => {
    expect(extractStepTypes(composedSchema)).toEqual(['cases.createCase', 'if', 'slack']);
    expect(extractTriggerTypes(composedSchema)).toEqual([
      'cases.caseCreated',
      'cases.caseUpdated',
      'manual',
    ]);
  });

  it('ignores parameter subtrees that happen to have a `type` property', () => {
    // `security`/`observability` come from a `with.type` parameter, not a step
    // discriminator, so they must be absent.
    const steps = extractStepTypes(composedSchema);
    expect(steps).not.toContain('security');
    expect(steps).not.toContain('observability');
  });

  it('works on the template-transformed document (unwraps template wrappers)', () => {
    const templated = transformToTemplate(composedSchema);
    expect(extractStepTypes(templated)).toEqual(['cases.createCase', 'if', 'slack']);
    expect(extractTriggerTypes(templated)).toEqual([
      'cases.caseCreated',
      'cases.caseUpdated',
      'manual',
    ]);
  });

  it('throws (never returns an empty list) when a property union is absent', () => {
    expect(() => extractStepTypes({ type: 'object', properties: {} })).toThrow(
      /Could not locate the "steps" union/
    );
    expect(() => extractTriggerTypes({ type: 'object' })).toThrow(
      /Could not locate the "triggers" union/
    );
  });

  it('throws when the union resolves but has no `type` discriminators', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        steps: { type: 'array', items: { $ref: '#/definitions/EmptyUnion' } },
      },
      definitions: {
        // A union whose members carry no `properties.type` discriminator.
        EmptyUnion: { oneOf: [{ type: 'object' }, { type: 'object' }] },
      },
    };
    expect(() => extractStepTypes(schema)).toThrow(/found no "type" discriminators/);
  });
});
