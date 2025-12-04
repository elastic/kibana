/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { synth } from '../../../..';
import { isSource } from '../../../ast/is';
import { columnsAfter } from './columns_after';

describe('FROM columnsAfter', () => {
  it('returns fields from the source', async () => {
    const sourceFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'double', userDefined: false },
      { name: 'field2', type: 'keyword', userDefined: false },
    ];

    const command = { args: [{ type: 'source', name: 'index1' }] } as any;

    const result = await columnsAfter(command, [], '', {
      fromFrom: () => Promise.resolve(sourceFields),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    expect(result).toEqual(sourceFields);
  });

  it('fetches fields from nested index in simple subquery', async () => {
    const command = synth.cmd`FROM index1, (FROM index2)`;

    const index1Fields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
    ];

    const index2Fields: ESQLFieldWithMetadata[] = [
      { name: 'field2', type: 'long', userDefined: false },
      { name: 'field3', type: 'text', userDefined: false },
    ];

    const result = await columnsAfter(command, [], '', {
      fromFrom: (cmd) => {
        if (cmd.args.length === 1 && isSource(cmd.args[0])) {
          const sourceName = cmd.args[0].name;

          if (sourceName === 'index1') {
            return Promise.resolve(index1Fields);
          }

          if (sourceName === 'index2') {
            return Promise.resolve(index2Fields);
          }
        }

        return Promise.resolve([]);
      },
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'field1', type: 'keyword', userDefined: false },
        { name: 'field2', type: 'long', userDefined: false },
        { name: 'field3', type: 'text', userDefined: false },
      ])
    );

    expect(result).toHaveLength(3);
  });

  it('handles FROM with subqueries including nested levels and complex pipelines', async () => {
    // Comprehensive query that tests:
    // - Simple source (index1)
    // - Subquery with complex pipeline (index2 with WHERE, EVAL, STATS, SORT, LIMIT)
    // - Simple source (index3)
    // - Deeply nested subquery (index4 with nested index5, multiple KEEPs)
    const command = synth.cmd`FROM index1, (FROM index2 | WHERE a > 10 | EVAL b = a * 2 | STATS cnt = COUNT(*) BY c | SORT cnt DESC | LIMIT 10), index3, (FROM index4, (FROM index5 | KEEP field5) | KEEP status, field5)`;

    const index1Fields: ESQLFieldWithMetadata[] = [
      { name: 'id', type: 'keyword', userDefined: false },
      { name: 'name', type: 'text', userDefined: false },
    ];

    const index2Fields: ESQLFieldWithMetadata[] = [
      { name: 'a', type: 'long', userDefined: false },
      { name: 'c', type: 'keyword', userDefined: false },
      { name: 'other', type: 'text', userDefined: false },
    ];

    const index3Fields: ESQLFieldWithMetadata[] = [
      { name: 'x', type: 'double', userDefined: false },
      { name: 'y', type: 'keyword', userDefined: false },
    ];

    const index4Fields: ESQLFieldWithMetadata[] = [
      { name: 'status', type: 'keyword', userDefined: false },
      { name: 'timestamp', type: 'date', userDefined: false },
    ];

    const index5Fields: ESQLFieldWithMetadata[] = [
      { name: 'field5', type: 'text', userDefined: false },
      { name: 'other5', type: 'keyword', userDefined: false },
    ];

    const result = await columnsAfter(command, [], '', {
      fromFrom: (cmd) => {
        if (cmd.args.length === 1 && isSource(cmd.args[0])) {
          const sourceName = cmd.args[0].name;

          if (sourceName === 'index1') {
            return Promise.resolve(index1Fields);
          }

          if (sourceName === 'index2') {
            return Promise.resolve(index2Fields);
          }

          if (sourceName === 'index3') {
            return Promise.resolve(index3Fields);
          }

          if (sourceName === 'index4') {
            return Promise.resolve(index4Fields);
          }

          if (sourceName === 'index5') {
            return Promise.resolve(index5Fields);
          }
        }

        return Promise.resolve([]);
      },
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    // Verify expected fields are present
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'id', type: 'keyword', userDefined: false },
        { name: 'name', type: 'text', userDefined: false },
        { name: 'cnt', type: 'long', userDefined: true, location: expect.any(Object) },
        { name: 'x', type: 'double', userDefined: false },
        { name: 'y', type: 'keyword', userDefined: false },
        { name: 'status', type: 'keyword', userDefined: false },
        { name: 'field5', type: 'text', userDefined: false },
      ])
    );

    // Verify fields that should NOT be present (filtered by KEEP)
    const fieldNames = result.map((f) => f.name);

    expect(fieldNames).not.toContain('other5');
    expect(fieldNames).not.toContain('timestamp');
  });

  it('passes METADATA options to fromFrom when processing sources', async () => {
    const command = synth.cmd`FROM index1 METADATA _id, _index`;

    const result = await columnsAfter(command, [], '', {
      fromFrom: (cmd) => {
        const sources = cmd.args.filter((arg) => !Array.isArray(arg) && arg.type === 'source');
        const options = cmd.args.filter((arg) => !Array.isArray(arg) && arg.type === 'option');

        expect(sources).toHaveLength(1);
        expect(options.length).toBeGreaterThan(0);

        const hasMetadataOption = options.some(
          (opt) => !Array.isArray(opt) && opt.name === 'metadata'
        );
        expect(hasMetadataOption).toBe(true);

        return Promise.resolve([
          { name: 'field1', type: 'keyword', userDefined: false },
          { name: '_id', type: 'keyword', userDefined: false },
          { name: '_index', type: 'keyword', userDefined: false },
        ]);
      },
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    const fieldNames = result.map(({ name }) => name);

    expect(fieldNames).toContain('field1');
    expect(fieldNames).toContain('_id');
    expect(fieldNames).toContain('_index');
  });
});
