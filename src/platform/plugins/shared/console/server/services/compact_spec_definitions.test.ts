/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { SpecDefinitionsJson } from '../types';
import { GENERATED_GLOBAL_PREFIX } from '../../common/constants';
import { compactSpecDefinitions } from './compact_spec_definitions';

const GENERATED_SCOPE_PREFIX = `GLOBAL.${GENERATED_GLOBAL_PREFIX}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createLargeRule = (reverse = false): Record<string, unknown> => {
  const entries = Array.from({ length: 40 }, (_, index) => [
    `property_${String(index).padStart(2, '0')}`,
    `value_${index}`,
  ]);
  return Object.fromEntries(reverse ? entries.reverse() : entries);
};

const createDefinitions = (
  firstRules: Record<string, unknown>,
  secondRules: Record<string, unknown>
): SpecDefinitionsJson => ({
  name: 'es',
  globals: {},
  endpoints: {
    first: { data_autocomplete_rules: firstRules },
    second: { data_autocomplete_rules: secondRules },
  },
});

const readRules = (
  definitions: SpecDefinitionsJson,
  endpointName: string
): Record<string, unknown> => {
  const endpoint = definitions.endpoints[endpointName];
  if (!isRecord(endpoint) || !isRecord(endpoint.data_autocomplete_rules)) {
    throw new Error(`Missing body rules for ${endpointName}`);
  }
  return endpoint.data_autocomplete_rules;
};

const resolveGeneratedRule = (
  value: unknown,
  globals: Record<string, unknown>
): Record<string, unknown> => {
  if (
    isRecord(value) &&
    typeof value.__scope_link === 'string' &&
    value.__scope_link.startsWith(GENERATED_SCOPE_PREFIX)
  ) {
    const resolved = globals[value.__scope_link.slice('GLOBAL.'.length)];
    if (isRecord(resolved)) {
      return resolved;
    }
  }
  if (!isRecord(value)) {
    throw new Error('Expected an object rule');
  }
  return value;
};

const expandGeneratedRules = (value: unknown, globals: Record<string, unknown>): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => expandGeneratedRules(entry, globals));
  }
  if (!isRecord(value)) {
    return value;
  }
  const link = value.__scope_link;
  if (typeof link === 'string' && link.startsWith(GENERATED_SCOPE_PREFIX)) {
    const globalName = link.slice('GLOBAL.'.length);
    return expandGeneratedRules(globals[globalName], globals);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      expandGeneratedRules(nestedValue, globals),
    ])
  );
};

describe('WHEN compacting Console spec definitions', () => {
  it('SHOULD share repeated large body rules without changing their expanded value', () => {
    const repeatedRules = createLargeRule();
    const definitions = createDefinitions(repeatedRules, structuredClone(repeatedRules));

    const compactDefinitions = compactSpecDefinitions(definitions);
    const generatedGlobalNames = Object.keys(compactDefinitions.globals).filter((name) =>
      name.startsWith(GENERATED_GLOBAL_PREFIX)
    );

    expect(generatedGlobalNames).toHaveLength(1);
    expect(
      expandGeneratedRules(readRules(compactDefinitions, 'first'), compactDefinitions.globals)
    ).toEqual(repeatedRules);
    expect(
      expandGeneratedRules(readRules(compactDefinitions, 'second'), compactDefinitions.globals)
    ).toEqual(repeatedRules);
    expect(definitions.globals).toEqual({});
    expect(readRules(definitions, 'first')).toEqual(repeatedRules);
  });

  it('SHOULD keep differently ordered rules separate because suggestion order is observable', () => {
    const definitions = createDefinitions(createLargeRule(), createLargeRule(true));

    const compactDefinitions = compactSpecDefinitions(definitions);

    expect(
      Object.keys(compactDefinitions.globals).filter((name) =>
        name.startsWith(GENERATED_GLOBAL_PREFIX)
      )
    ).toEqual([]);
    expect(readRules(compactDefinitions, 'first')).toEqual(createLargeRule());
    expect(readRules(compactDefinitions, 'second')).toEqual(createLargeRule(true));
  });

  it('SHOULD keep endpoint-relative scope links in their original compiling context', () => {
    const relativeRules = {
      ...createLargeRule(),
      nested: { __scope_link: '.other_path' },
    };
    const definitions = createDefinitions(relativeRules, structuredClone(relativeRules));

    const compactDefinitions = compactSpecDefinitions(definitions);

    expect(readRules(compactDefinitions, 'first')).toEqual(relativeRules);
    expect(readRules(compactDefinitions, 'second')).toEqual(relativeRules);
  });

  it('SHOULD preserve array and metadata shapes that scope links cannot replace', () => {
    const repeatedRules = {
      list: [createLargeRule()],
      one_of: { __one_of: [createLargeRule(), createLargeRule(true)] },
      any_of: { __any_of: [createLargeRule()] },
      templated: {
        __template: { first: 'value' },
        nested: createLargeRule(),
      },
    };
    const definitions = createDefinitions(repeatedRules, structuredClone(repeatedRules));

    const compactDefinitions = compactSpecDefinitions(definitions);
    const compactRules = resolveGeneratedRule(
      readRules(compactDefinitions, 'first'),
      compactDefinitions.globals
    );

    expect(Array.isArray(compactRules.list)).toBe(true);
    expect(isRecord(compactRules.one_of) && Array.isArray(compactRules.one_of.__one_of)).toBe(true);
    expect(isRecord(compactRules.any_of) && Array.isArray(compactRules.any_of.__any_of)).toBe(true);
    expect(isRecord(compactRules.templated) && compactRules.templated.__template).toEqual({
      first: 'value',
    });
    expect(
      isRecord(compactRules.templated) &&
        isRecord(compactRules.templated.nested) &&
        compactRules.templated.nested.__scope_link
    ).toEqual(expect.stringMatching(/^GLOBAL\.__generated_[a-f0-9]+$/));
  });

  it('SHOULD keep conditional template rules inline for their raw-description consumer', () => {
    const conditionalRules = {
      ...createLargeRule(),
      settings: {
        __one_of: [
          {
            __condition: { lines_regex: 'type: fs' },
            __template: { location: 'path' },
            ...createLargeRule(),
          },
        ],
      },
    };
    const definitions = createDefinitions(conditionalRules, structuredClone(conditionalRules));

    const compactDefinitions = compactSpecDefinitions(definitions);

    expect(readRules(compactDefinitions, 'first')).toEqual(conditionalRules);
    expect(readRules(compactDefinitions, 'second')).toEqual(conditionalRules);
  });

  it('SHOULD keep small repeated rules inline', () => {
    const smallRules = { property: '' };
    const definitions = createDefinitions(smallRules, structuredClone(smallRules));

    const compactDefinitions = compactSpecDefinitions(definitions);

    expect(compactDefinitions.globals).toEqual({});
    expect(readRules(compactDefinitions, 'first')).toEqual(smallRules);
    expect(readRules(compactDefinitions, 'second')).toEqual(smallRules);
  });

  it('SHOULD extend a content address that collides with an existing global name', () => {
    const repeatedRules = createLargeRule();
    const definitions = createDefinitions(repeatedRules, structuredClone(repeatedRules));
    const hash = createHash('sha256').update(JSON.stringify(repeatedRules)).digest('hex');
    const existingName = `${GENERATED_GLOBAL_PREFIX}${hash.slice(0, 8)}`;
    definitions.globals[existingName] = { existing: true };

    const compactDefinitions = compactSpecDefinitions(definitions);
    const generatedNames = Object.keys(compactDefinitions.globals).filter((name) =>
      name.startsWith(GENERATED_GLOBAL_PREFIX)
    );

    expect(compactDefinitions.globals[existingName]).toEqual({ existing: true });
    expect(generatedNames).toHaveLength(2);
    expect(generatedNames).toContain(`${GENERATED_GLOBAL_PREFIX}${hash.slice(0, 10)}`);
  });
});
