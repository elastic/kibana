/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDynamicValue, isLiquidTagValue, isVariableValue } from '../regex';
import {
  buildTemplateTolerantJsonSchema,
  wholeValueStringAlternative,
  TEMPLATE_VALUE_DEF_NAME,
  type JsonObject,
  type JsonValue,
} from './build_template_tolerant_json_schema';

// The Kibana jest environment disallows runtime code generation (`new Function`),
// which a JSON Schema validator such as ajv relies on. We therefore validate the
// woven schema structurally and exercise the emitted `pattern`s with `RegExp`
// using the unicode (`u`) flag - the exact matching semantics ajv applies with
// its default `unicodeRegExp: true`.

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

const templateValueDef = (root: JsonObject): JsonObject =>
  asObject(asObject(root.definitions)[TEMPLATE_VALUE_DEF_NAME]);

/** Compiled emitted string patterns from the shared template-value definition. */
const templatePatterns = (root: JsonObject): RegExp[] =>
  anyOfBranches(templateValueDef(root))
    .filter((branch) => typeof branch.pattern === 'string')
    // Unicode flag mirrors ajv's default `unicodeRegExp: true`.
    .map((branch) => new RegExp(branch.pattern as string, 'u'));

/** Whether the woven string alternatives accept `value` (JSON Schema anyOf semantics). */
const leafAccepts = (patterns: RegExp[], value: string): boolean =>
  patterns.some((pattern) => pattern.test(value));

const numberLeafSchema: JsonObject = {
  type: 'object',
  properties: { count: { type: 'number' } },
  required: ['count'],
  additionalProperties: false,
};

describe('buildTemplateTolerantJsonSchema - runtime parity (liquid alternatives)', () => {
  const root = buildTemplateTolerantJsonSchema(numberLeafSchema);
  const patterns = templatePatterns(root);

  const runtimeAccepts = (value: string): boolean =>
    isVariableValue(value) || isDynamicValue(value) || isLiquidTagValue(value);

  // A matrix that spans whole-value/embedded and each liquid construct.
  const matrix: string[] = [
    '{{ steps.a.output }}',
    '${{ steps.a.output }}',
    '{{ }}',
    '${{ }}',
    'a {{ x }} b',
    'lead ${{ a }}',
    '{{ a }} trailing',
    '{% if x %}',
    '{% if x %}1{% endif %}',
    '{%- assign y = 1 -%}',
    'prefix {% x %} suffix',
    'plain string',
    '__install__.max-age-in-days',
    '5',
    '',
  ];

  it.each(matrix)('weaver leaf-acceptance matches runtime suppression for %p', (value) => {
    expect(leafAccepts(patterns, value)).toBe(runtimeAccepts(value));
  });

  it('accepts {{ }} / ${{ }} only as the whole value (anchored)', () => {
    expect(leafAccepts(patterns, '{{ x }}')).toBe(true);
    expect(leafAccepts(patterns, '${{ x }}')).toBe(true);
    expect(leafAccepts(patterns, 'a {{ x }} b')).toBe(false);
    expect(leafAccepts(patterns, 'lead ${{ a }}')).toBe(false);
  });

  it('accepts {% %} as an unanchored substring (mirroring isLiquidTagValue)', () => {
    expect(leafAccepts(patterns, '{% if x %}')).toBe(true);
    expect(leafAccepts(patterns, 'prefix {% x %} suffix')).toBe(true);
  });

  it('emits unicode-safe patterns (no invalid \\% escape)', () => {
    for (const branch of anyOfBranches(templateValueDef(root))) {
      if (typeof branch.pattern === 'string') {
        expect(() => new RegExp(branch.pattern as string, 'u')).not.toThrow();
      }
    }
  });
});

describe('buildTemplateTolerantJsonSchema - extra alternatives', () => {
  it('adds caller-supplied whole-value alternatives to the shared definition', () => {
    const installAlternative = wholeValueStringAlternative(/__install__\.([a-zA-Z0-9_-]+)/.source);
    const root = buildTemplateTolerantJsonSchema(numberLeafSchema, {
      extraAlternatives: [installAlternative],
    });
    const patterns = templatePatterns(root);

    expect(leafAccepts(patterns, '__install__.max-age-in-days')).toBe(true);
    expect(leafAccepts(patterns, '__install__.')).toBe(false);
    expect(leafAccepts(patterns, 'prefix__install__.name')).toBe(false);
    // Liquid tolerance is still present.
    expect(leafAccepts(patterns, '{{ x }}')).toBe(true);
  });

  it('has exactly one more alternative than the default', () => {
    const withoutExtra = anyOfBranches(
      templateValueDef(buildTemplateTolerantJsonSchema(numberLeafSchema))
    );
    const withExtra = anyOfBranches(
      templateValueDef(
        buildTemplateTolerantJsonSchema(numberLeafSchema, {
          extraAlternatives: [wholeValueStringAlternative('x')],
        })
      )
    );
    expect(withExtra).toHaveLength(withoutExtra.length + 1);
  });
});

describe('buildTemplateTolerantJsonSchema - which positions get wrapped', () => {
  const build = (leaf: JsonObject): JsonObject =>
    asObject(
      asObject(
        buildTemplateTolerantJsonSchema({
          type: 'object',
          properties: { leaf },
        }).properties
      ).leaf
    );

  const isWrapped = (node: JsonObject): boolean =>
    Array.isArray(node.anyOf) &&
    node.anyOf.some(
      (branch) => asObject(branch).$ref === `#/definitions/${TEMPLATE_VALUE_DEF_NAME}`
    );

  it('wraps non-string typed positions', () => {
    expect(isWrapped(build({ type: 'number' }))).toBe(true);
    expect(isWrapped(build({ type: 'boolean' }))).toBe(true);
    expect(isWrapped(build({ type: 'object', properties: {} }))).toBe(true);
    expect(isWrapped(build({ type: 'array', items: { type: 'string' } }))).toBe(true);
  });

  it('wraps enum and const positions (full faithfulness)', () => {
    expect(isWrapped(build({ enum: ['a', 'b'] }))).toBe(true);
    expect(isWrapped(build({ const: 'a' }))).toBe(true);
    expect(isWrapped(build({ type: 'string', enum: ['a', 'b'] }))).toBe(true);
  });

  it('wraps constrained strings', () => {
    expect(isWrapped(build({ type: 'string', pattern: '^x' }))).toBe(true);
    expect(isWrapped(build({ type: 'string', format: 'email' }))).toBe(true);
    expect(isWrapped(build({ type: 'string', minLength: 3 }))).toBe(true);
  });

  it('leaves unconstrained strings and fully-open nodes untouched', () => {
    expect(isWrapped(build({ type: 'string' }))).toBe(false);
    expect(isWrapped(build({ description: 'anything goes' }))).toBe(false);
    expect(isWrapped(build({ type: ['string', 'number'] }))).toBe(false);
  });

  it('does not wrap a bare $ref site (the target definition is wrapped instead)', () => {
    const root = buildTemplateTolerantJsonSchema({
      type: 'object',
      properties: { a: { $ref: '#/definitions/num' } },
      definitions: { num: { type: 'number' } },
    });
    expect(asObject(root.properties).a).toEqual({ $ref: '#/definitions/num' });
    expect(isWrapped(asObject(asObject(root.definitions).num))).toBe(true);
  });

  it('never wraps the root document', () => {
    const root = buildTemplateTolerantJsonSchema(numberLeafSchema);
    expect(root.anyOf).toBeUndefined();
    expect(root.type).toBe('object');
  });

  it('does not mutate the input schema', () => {
    const input: JsonObject = { type: 'object', properties: { count: { type: 'number' } } };
    const snapshot = JSON.stringify(input);
    buildTemplateTolerantJsonSchema(input);
    buildTemplateTolerantJsonSchema(input, {
      extraAlternatives: [wholeValueStringAlternative('x')],
    });
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
