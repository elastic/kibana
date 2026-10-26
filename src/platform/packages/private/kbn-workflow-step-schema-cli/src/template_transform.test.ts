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

// The exhaustive weaver behavior (runtime parity, which positions get wrapped) is
// covered co-located with the util in `@kbn/workflows-yaml`. Here we only assert
// the CLI wiring: strict/template both weave LiquidJS tolerance, and only the
// `template` variant adds the library-sourced `__install__` placeholder.

const asObject = (value: JsonValue | undefined): JsonObject => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected an object, got ${JSON.stringify(value)}`);
  }
  return value;
};

const templatePatterns = (root: JsonObject): RegExp[] => {
  const def = asObject(asObject(root.definitions)[TEMPLATE_VALUE_DEF_NAME]);
  const branches = def.anyOf;
  if (!Array.isArray(branches)) {
    throw new Error('Expected the template-value definition to be an anyOf');
  }
  return branches
    .map(asObject)
    .filter((branch) => typeof branch.pattern === 'string')
    .map((branch) => new RegExp(branch.pattern as string, 'u'));
};

const accepts = (root: JsonObject, value: string): boolean =>
  templatePatterns(root).some((pattern) => pattern.test(value));

const numberLeafSchema: JsonObject = {
  type: 'object',
  properties: { count: { type: 'number' } },
};

describe('transformToStrict', () => {
  const root = transformToStrict(numberLeafSchema);

  it('weaves LiquidJS tolerance', () => {
    expect(accepts(root, '{{ x }}')).toBe(true);
    expect(accepts(root, '${{ x }}')).toBe(true);
    expect(accepts(root, '{% if x %}')).toBe(true);
  });

  it('does not accept the __install__ placeholder', () => {
    expect(accepts(root, '__install__.max-age-in-days')).toBe(false);
  });
});

describe('transformToTemplate', () => {
  const root = transformToTemplate(numberLeafSchema);

  it('is a superset of strict (LiquidJS still tolerated)', () => {
    expect(accepts(root, '{{ x }}')).toBe(true);
    expect(accepts(root, '${{ x }}')).toBe(true);
  });

  it('accepts a whole-value __install__ placeholder sourced from the library', () => {
    expect(accepts(root, '__install__.max-age-in-days')).toBe(true);
    expect(accepts(root, '__install__.')).toBe(false);
    expect(accepts(root, 'prefix__install__.name')).toBe(false);
  });

  it('adds exactly one alternative beyond strict', () => {
    expect(templatePatterns(root)).toHaveLength(
      templatePatterns(transformToStrict(numberLeafSchema)).length + 1
    );
  });
});
