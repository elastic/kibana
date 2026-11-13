/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DataReferenceCatalog,
  DataReferenceGroupId,
  DataReferenceItem,
} from './build_data_reference_catalog';
import { hasFilter } from './reference_grammar';
import { lookupReferenceTypeLabel } from './reference_value';

const item = (path: string, typeLabel: string, extra: Partial<DataReferenceItem> = {}) => ({
  path,
  label: path.split('.').pop() ?? path,
  typeLabel,
  drillable: false,
  originLabel: 'test',
  ...extra,
});

/**
 * What the lookup did before the catalog was indexed, kept as the oracle: a depth-first walk where
 * the first leaf with the path wins, and an entity (a step or trigger) answers only when no leaf
 * does, the last entity seen answering.
 */
const walkLookup = (catalog: DataReferenceCatalog, expression: string): string | undefined => {
  if (hasFilter(expression)) return undefined;
  const path = expression.trim();
  let entityLabel: string | undefined;
  const walk = (items: readonly DataReferenceItem[]): string | undefined => {
    for (const candidate of items) {
      if (candidate.path === path) {
        if (!candidate.isEntity) return candidate.typeLabel;
        entityLabel = candidate.typeLabel;
      }
      const found = candidate.children ? walk(candidate.children) : undefined;
      if (found) return found;
    }
    return undefined;
  };
  for (const group of catalog.groups) {
    const found = walk(group.items);
    if (found) return found;
  }
  return entityLabel;
};

const GROUP_IDS: readonly DataReferenceGroupId[] = ['triggers', 'steps', 'context', 'stepContext'];

const group = (id: DataReferenceGroupId, items: DataReferenceItem[]) => ({
  id,
  title: id,
  description: '',
  items,
});

describe('lookupReferenceTypeLabel', () => {
  it('finds a leaf by its path, at any depth', () => {
    const catalog: DataReferenceCatalog = {
      groups: [
        group('context', [
          item('consts.a', 'string'),
          item('steps.s', 'object', {
            isEntity: true,
            children: [
              item('steps.s.output', 'object', { children: [item('steps.s.output.n', 'number')] }),
            ],
          }),
        ]),
      ],
    };
    expect(lookupReferenceTypeLabel(catalog, 'consts.a')).toBe('string');
    expect(lookupReferenceTypeLabel(catalog, 'steps.s.output.n')).toBe('number');
  });

  it('answers with the leaf when a step entity and its output leaf share a path', () => {
    const catalog: DataReferenceCatalog = {
      groups: [
        group('steps', [item('steps.s', 'unknown', { isEntity: true }), item('steps.s', 'array')]),
      ],
    };
    expect(lookupReferenceTypeLabel(catalog, 'steps.s')).toBe('array');
  });

  it('answers with an entity only when no leaf has the path', () => {
    const catalog: DataReferenceCatalog = {
      groups: [group('steps', [item('steps.s', 'object', { isEntity: true })])],
    };
    expect(lookupReferenceTypeLabel(catalog, 'steps.s')).toBe('object');
  });

  it('does not know a path the catalog lacks, or one with a filter', () => {
    const catalog: DataReferenceCatalog = {
      groups: [group('context', [item('consts.a', 'string')])],
    };
    expect(lookupReferenceTypeLabel(catalog, 'consts.zzz')).toBeUndefined();
    expect(lookupReferenceTypeLabel(catalog, 'consts.a | json')).toBeUndefined();
  });

  it('types a comparison as boolean whatever its operands are', () => {
    expect(lookupReferenceTypeLabel({ groups: [] }, 'a.b != blank')).toBe('boolean');
  });

  it('ignores the whitespace around the path', () => {
    const catalog: DataReferenceCatalog = {
      groups: [group('context', [item('consts.a', 'string')])],
    };
    expect(lookupReferenceTypeLabel(catalog, '  consts.a ')).toBe('string');
  });

  describe('against the tree walk it replaced', () => {
    /** A deterministic generator, so a failure names the same catalog on every run. */
    const generate = (seed: number): DataReferenceCatalog => {
      let state = seed;
      const next = (limit: number) => {
        state = (state * 48271) % 2147483647;
        return state % limit;
      };
      const paths = ['a', 'a.b', 'a.b.c', 'x', 'x.y', 'steps.s', 'steps.s.output', 'steps.t'];
      const types = ['string', 'number', 'boolean', 'array', 'object'];
      const make = (depth: number): DataReferenceItem[] =>
        Array.from({ length: 1 + next(4) }, () =>
          item(paths[next(paths.length)], types[next(types.length)], {
            isEntity: next(3) === 0 ? true : undefined,
            children: depth < 2 && next(2) === 0 ? make(depth + 1) : undefined,
          })
        );
      return {
        groups: Array.from({ length: 1 + next(3) }, (_, index) => group(GROUP_IDS[index], make(0))),
      };
    };

    it.each(Array.from({ length: 200 }, (_, seed) => [seed + 1]))(
      'gives the same answer for every path on catalog %i',
      (seed) => {
        const catalog = generate(seed);
        const paths = [
          'a',
          'a.b',
          'a.b.c',
          'x',
          'x.y',
          'steps.s',
          'steps.s.output',
          'steps.t',
          'nope',
        ];
        const answers = paths.map((path) => lookupReferenceTypeLabel(catalog, path));
        expect(answers).toEqual(paths.map((path) => walkLookup(catalog, path)));
      }
    );
  });

  describe('cost', () => {
    it('reads the catalog once, however many references it is asked about', () => {
      let reads = 0;
      const leaves: DataReferenceItem[] = Array.from({ length: 200 }, (_, index) => ({
        ...item(`consts.k${index}`, 'string'),
        get children() {
          reads += 1;
          return undefined;
        },
      }));
      const catalog: DataReferenceCatalog = { groups: [group('context', leaves)] };

      lookupReferenceTypeLabel(catalog, 'consts.k0');
      const afterFirst = reads;
      for (let index = 0; index < 100; index++) {
        lookupReferenceTypeLabel(catalog, `consts.k${index % 200}`);
      }
      expect(reads).toBe(afterFirst);
    });

    it('indexes each catalog separately', () => {
      const first: DataReferenceCatalog = {
        groups: [group('context', [item('consts.a', 'string')])],
      };
      const second: DataReferenceCatalog = {
        groups: [group('context', [item('consts.a', 'number')])],
      };
      expect(lookupReferenceTypeLabel(first, 'consts.a')).toBe('string');
      expect(lookupReferenceTypeLabel(second, 'consts.a')).toBe('number');
    });
  });
});
