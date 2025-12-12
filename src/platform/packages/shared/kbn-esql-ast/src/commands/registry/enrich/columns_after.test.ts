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
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('ENRICH columnsAfter', () => {
  it('returns previousColumns when no enrich columns', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const result = await columnsAfter(synth.cmd`ENRICH policy ON matchfield`, previousColumns, '', {
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
      fromFrom: () => Promise.resolve([]),
    });
    expect(result).toEqual(previousColumns);
  });

  it('adds all enrich columns to when no WITH clause', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const enrichColumns: ESQLFieldWithMetadata[] = [
      { name: 'enrichField1', type: 'keyword', userDefined: false },
      { name: 'enrichField2', type: 'double', userDefined: false },
    ];
    const result = await columnsAfter(synth.cmd`ENRICH policy ON matchfield`, previousColumns, '', {
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve(enrichColumns),
      fromFrom: () => Promise.resolve([]),
    });
    expect(result).toEqual([...enrichColumns, ...previousColumns]);
  });

  it('adds only declared columns when WITH clause is present', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const enrichColumns: ESQLFieldWithMetadata[] = [
      { name: 'enrichField1', type: 'keyword', userDefined: false },
      { name: 'enrichField2', type: 'double', userDefined: false },
    ];
    const result = await columnsAfter(
      synth.cmd`ENRICH policy ON matchfield WITH enrichField2`,
      previousColumns,
      '',
      {
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve(enrichColumns),
        fromFrom: () => Promise.resolve([]),
      }
    );
    expect(result).toEqual([enrichColumns[1], ...previousColumns]);
  });

  it('renames enrichment fields using WITH', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const enrichColumns: ESQLFieldWithMetadata[] = [
      { name: 'enrichField1', type: 'keyword', userDefined: false },
      { name: 'enrichField2', type: 'double', userDefined: false },
    ];
    const result = await columnsAfter(
      synth.cmd`ENRICH policy ON matchfield WITH foo = enrichField1, bar = enrichField2`,
      previousColumns,
      '',
      {
        fromEnrich: () => Promise.resolve(enrichColumns),
        fromJoin: () => Promise.resolve([]),
        fromFrom: () => Promise.resolve([]),
      }
    );
    const expected = [
      { name: 'foo', type: 'keyword', userDefined: false },
      { name: 'bar', type: 'double', userDefined: false },
      ...previousColumns,
    ];
    expect(result).toEqual(expected);
  });

  it('overwrites previous columns with the same name', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const enrichFields: ESQLFieldWithMetadata[] = [
      { name: 'fieldA', type: 'text', userDefined: false },
      { name: 'fieldC', type: 'double', userDefined: false },
    ];
    const result = await columnsAfter(synth.cmd`ENRICH policy ON matchfield`, previousColumns, '', {
      fromEnrich: () => Promise.resolve(enrichFields),
      fromJoin: () => Promise.resolve([]),
      fromFrom: () => Promise.resolve([]),
    });
    expect(result).toEqual([
      { name: 'fieldA', type: 'text', userDefined: false },
      { name: 'fieldC', type: 'double', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ]);
  });
});
