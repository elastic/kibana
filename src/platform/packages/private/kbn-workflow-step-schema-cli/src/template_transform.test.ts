/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  transformToStrict,
  transformToTemplate,
  TEMPLATE_VALUE_DEF_NAME,
} from './template_transform';
import type { JsonObject, JsonValue } from './types';

// The Kibana jest environment disallows runtime code generation (`new Function`),
// which a JSON Schema validator such as ajv relies on. We therefore validate the
// transform structurally and exercise the emitted `pattern`s with `RegExp` - the
// exact matching semantics that any downstream validator will apply.

const asObject = (value: JsonValue | undefined): JsonObject => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected an object, got ${JSON.stringify(value)}`);
  }
  return value;
};

const anyOfBranches = (node: JsonObject): JsonObject[] => {
  const branches = node.anyOf;
  if (!Array.isArray(branches)) {
    throw new Error(`Expected an anyOf node, got ${JSON.stringify(node)}`);
  }
  return branches.map(asObject);
};

const resolveRef = (root: JsonObject, ref: string): JsonObject => {
  const segments = ref.replace(/^#\//, '').split('/');
  let current: JsonValue = root;
  for (const segment of segments) {
    current = asObject(current)[segment];
  }
  return asObject(current);
};

/** The shared template-value definition holding the LiquidJS/install branches. */
const templateValueDef = (root: JsonObject): JsonObject =>
  asObject(asObject(root.definitions)[TEMPLATE_VALUE_DEF_NAME]);

/**
 * Leaf-level acceptance check mirroring a JSON Schema anyOf of scalar branches,
 * following the single shared `$ref` back to the template-value definition.
 */
const acceptsLeaf = (root: JsonObject, node: JsonObject, value: JsonValue): boolean =>
  anyOfBranches(node).some((branch) => {
    if (typeof branch.$ref === 'string') {
      return acceptsLeaf(root, resolveRef(root, branch.$ref), value);
    }
    if (branch.type === 'number' || branch.type === 'integer') {
      return typeof value === 'number';
    }
    if (branch.type === 'boolean') {
      return typeof value === 'boolean';
    }
    if (branch.type === 'string') {
      if (typeof value !== 'string') {
        return false;
      }
      return typeof branch.pattern === 'string' ? new RegExp(branch.pattern).test(value) : true;
    }
    return false;
  });

const numberSchema: JsonObject = {
  type: 'object',
  properties: { count: { type: 'number' } },
  required: ['count'],
  additionalProperties: false,
};

describe('template transform - strict variant (number leaf)', () => {
  const root = transformToStrict(numberSchema);
  const count = asObject(asObject(root.properties).count);

  it('wraps the leaf as [concrete, shared $ref] - no inlined branches', () => {
    const branches = anyOfBranches(count);
    expect(branches).toHaveLength(2);
    expect(branches[0]).toEqual({ type: 'number' });
    expect(branches[1]).toEqual({ $ref: `#/definitions/${TEMPLATE_VALUE_DEF_NAME}` });
  });

  it('accepts a concrete number', () => {
    expect(acceptsLeaf(root, count, 42)).toBe(true);
  });

  it('accepts a whole-value {{ }} variable', () => {
    expect(acceptsLeaf(root, count, '{{ steps.a.output }}')).toBe(true);
  });

  it('accepts a whole-value ${{ }} expression', () => {
    expect(acceptsLeaf(root, count, '${{ steps.a.output }}')).toBe(true);
  });

  it('accepts a {% %} liquid tag', () => {
    expect(acceptsLeaf(root, count, '{% if x %}1{% endif %}')).toBe(true);
  });

  it('rejects an empty {{ }} (\\s*\\S guard)', () => {
    expect(acceptsLeaf(root, count, '{{ }}')).toBe(false);
  });

  it('rejects an empty ${{ }} (\\s*\\S guard)', () => {
    expect(acceptsLeaf(root, count, '${{ }}')).toBe(false);
  });

  it('rejects a plain non-template string', () => {
    expect(acceptsLeaf(root, count, 'not a number')).toBe(false);
  });

  it('rejects an __install__ placeholder under strict', () => {
    expect(acceptsLeaf(root, count, '__install__.max-age-in-days')).toBe(false);
  });

  it('emits unicode-safe patterns (no invalid \\% escape)', () => {
    for (const branch of anyOfBranches(templateValueDef(root))) {
      if (typeof branch.pattern === 'string') {
        expect(() => new RegExp(branch.pattern as string, 'u')).not.toThrow();
      }
    }
  });
});

describe('template transform - template variant (number leaf)', () => {
  const root = transformToTemplate(numberSchema);
  const count = asObject(asObject(root.properties).count);

  it('accepts a concrete number', () => {
    expect(acceptsLeaf(root, count, 42)).toBe(true);
  });

  it('accepts an __install__ placeholder', () => {
    expect(acceptsLeaf(root, count, '__install__.max-age-in-days')).toBe(true);
  });

  it('accepts LiquidJS templating too (superset of strict)', () => {
    expect(acceptsLeaf(root, count, '{{ x }}')).toBe(true);
    expect(acceptsLeaf(root, count, '${{ x }}')).toBe(true);
  });

  it('rejects a plain non-template string', () => {
    expect(acceptsLeaf(root, count, 'nope')).toBe(false);
  });

  it('rejects a malformed install placeholder', () => {
    expect(acceptsLeaf(root, count, '__install__.')).toBe(false);
    expect(acceptsLeaf(root, count, 'prefix__install__.name')).toBe(false);
  });

  it('adds exactly one extra alternative in the shared definition', () => {
    const strictRoot = transformToStrict(numberSchema);
    expect(anyOfBranches(templateValueDef(root))).toHaveLength(
      anyOfBranches(templateValueDef(strictRoot)).length + 1
    );
  });
});

describe('template transform - discriminator & nested structure', () => {
  const stepSchema: JsonObject = {
    type: 'object',
    properties: {
      type: { type: 'string', const: 'delay' },
      with: {
        type: 'object',
        properties: { seconds: { type: 'number' } },
        additionalProperties: false,
      },
    },
    required: ['type'],
    additionalProperties: false,
  };
  const transformed = transformToStrict(stepSchema);
  const properties = asObject(transformed.properties);

  it('does not wrap the string discriminator', () => {
    expect(properties.type).toEqual({ type: 'string', const: 'delay' });
  });

  it('wraps the nested object while preserving its structure', () => {
    const withNode = asObject(properties.with);
    const [objectBranch] = anyOfBranches(withNode);
    expect(objectBranch.type).toBe('object');
    expect(objectBranch.additionalProperties).toBe(false);
    // The nested `seconds` leaf is itself templated.
    const seconds = asObject(asObject(objectBranch.properties).seconds);
    expect(acceptsLeaf(transformed, seconds, 5)).toBe(true);
    expect(acceptsLeaf(transformed, seconds, '${{ x }}')).toBe(true);
    expect(acceptsLeaf(transformed, seconds, 'nope')).toBe(false);
  });

  it('allows a ${{ }} in place of the whole nested object (via shared $ref)', () => {
    const withNode = asObject(properties.with);
    const branches = anyOfBranches(withNode);
    // Two branches: the concrete object and the shared template-value $ref.
    expect(branches).toHaveLength(2);
    expect(branches[1]).toEqual({ $ref: `#/definitions/${TEMPLATE_VALUE_DEF_NAME}` });
    expect(acceptsLeaf(transformed, withNode, '${{ steps.cfg.output }}')).toBe(true);
  });

  it('does not wrap the root document', () => {
    expect(transformed.anyOf).toBeUndefined();
    expect(transformed.type).toBe('object');
  });
});

describe('template transform - refs & purity', () => {
  it('transforms reused definitions so refs stay templatable', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: { a: { $ref: '#/definitions/num' } },
      definitions: { num: { type: 'number' } },
    };
    const transformed = transformToStrict(schema);
    // The $ref site is untouched; the definition itself is wrapped.
    expect(asObject(transformed.properties).a).toEqual({ $ref: '#/definitions/num' });
    const num = asObject(asObject(transformed.definitions).num);
    expect(acceptsLeaf(transformed, num, 3)).toBe(true);
    expect(acceptsLeaf(transformed, num, '{{ x }}')).toBe(true);
    expect(acceptsLeaf(transformed, num, 'plain')).toBe(false);
  });

  it('does not mutate the input schema', () => {
    const input: JsonObject = {
      type: 'object',
      properties: { count: { type: 'number' } },
    };
    const snapshot = JSON.stringify(input);
    transformToStrict(input);
    transformToTemplate(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
