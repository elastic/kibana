/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('FORK', () => {
  it('adds the _fork in the list of fields', async () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`FORK (LIMIT 10 ) (LIMIT 1000 ) `,
      previousCommandFields,
      '',
      {
        fromEnrich: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromFrom: () => Promise.resolve([]),
      }
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
      {
        name: '_fork',
        type: 'keyword',
        userDefined: false,
      },
    ]);
  });

  it('collects columns from branches', async () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`FORK (EVAL foo = 1 | RENAME foo AS bar) (EVAL lolz = 2 + 3 | EVAL field1 = 2.) `,
      previousCommandFields,
      '',
      {
        fromEnrich: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromFrom: () => Promise.resolve([]),
      }
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'bar', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
      { name: 'field1', type: 'double', userDefined: true, location: { min: 0, max: 0 } },
      { name: 'field2', type: 'double', userDefined: false },
      { name: 'lolz', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
      {
        name: '_fork',
        type: 'keyword',
        userDefined: false,
      },
    ]);
  });

  it('supports JOIN and ENRICH', async () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`FORK (LOOKUP JOIN lookup-index ON joinField) (ENRICH policy ON matchField)`,
      previousCommandFields,
      '',
      {
        fromEnrich: () =>
          Promise.resolve([
            {
              name: 'from-enrich',
              type: 'keyword',
              userDefined: false,
            },
          ]),
        fromJoin: () =>
          Promise.resolve([
            {
              name: 'from-join',
              type: 'keyword',
              userDefined: false,
            },
          ]),
        fromFrom: () =>
          Promise.resolve([
            {
              name: 'from-from',
              type: 'keyword',
              userDefined: false,
            },
          ]),
      }
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'from-join', type: 'keyword', userDefined: false },
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
      { name: 'from-enrich', type: 'keyword', userDefined: false },
      {
        name: '_fork',
        type: 'keyword',
        userDefined: false,
      },
    ]);
  });

  it('prefers userDefined columns over fields with the same name', async () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'foo', type: 'keyword', userDefined: false },
      { name: 'bar', type: 'double', userDefined: false },
    ];

    // Branch 1: foo is userDefined, bar is not
    // Branch 2: foo is not userDefined, bar is userDefined
    const result = await columnsAfter(
      synth.cmd`FORK (EVAL foo = 1) (EVAL bar = 2)`,
      previousCommandFields,
      '',
      {
        fromEnrich: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromFrom: () => Promise.resolve([]),
      }
    );

    // foo from branch 1 is userDefined, bar from branch 2 is userDefined
    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'foo', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
      { name: 'bar', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
      {
        name: '_fork',
        type: 'keyword',
        userDefined: false,
      },
    ]);
  });

  describe('conflicts between branches', () => {
    it('keeps the first userDefined column if both branches define userDefined columns with the same name', async () => {
      const previousCommandFields: ESQLColumnData[] = [
        { name: 'foo', type: 'keyword', userDefined: false },
      ];

      // Both branches define foo as userDefined, but with different types
      const result = await columnsAfter(
        synth.cmd`FORK (EVAL foo = 1) (EVAL foo = 2.5)`,
        previousCommandFields,
        '',
        {
          fromEnrich: () => Promise.resolve([]),
          fromJoin: () => Promise.resolve([]),
          fromFrom: () => Promise.resolve([]),
        }
      );

      // The first userDefined column wins (type: integer)
      expect(result).toEqual<ESQLColumnData[]>([
        { name: 'foo', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
        {
          name: '_fork',
          type: 'keyword',
          userDefined: false,
        },
      ]);
    });

    it("doesn't duplicate fields from branches", async () => {
      const previousCommandFields: ESQLColumnData[] = [
        { name: 'foo', type: 'keyword', userDefined: false },
      ];

      // All branches keep foo as a field, but with different types
      const result = await columnsAfter(
        synth.cmd`FORK (KEEP foo) (KEEP foo) (KEEP foo)`,
        previousCommandFields,
        '',
        {
          fromEnrich: () => Promise.resolve([]),
          fromJoin: () => Promise.resolve([]),
          fromFrom: () => Promise.resolve([]),
        }
      );

      expect(result).toEqual<ESQLColumnData[]>([
        { name: 'foo', type: 'keyword', userDefined: false },
        {
          name: '_fork',
          type: 'keyword',
          userDefined: false,
        },
      ]);
    });

    it('prefers userDefined column if one branch overwrites a field', async () => {
      const previousCommandFields: ESQLColumnData[] = [
        { name: 'foo', type: 'keyword', userDefined: false },
      ];

      // Branch 1: foo is userDefined, Branch 2: foo is not userDefined
      const result = await columnsAfter(
        synth.cmd`FORK (EVAL foo = 1) (LIMIT 1)`,
        previousCommandFields,
        '',
        {
          fromEnrich: () => Promise.resolve([]),
          fromJoin: () => Promise.resolve([]),
          fromFrom: () => Promise.resolve([]),
        }
      );

      expect(result).toEqual<ESQLColumnData[]>([
        { name: 'foo', type: 'integer', userDefined: true, location: { min: 0, max: 0 } },
        {
          name: '_fork',
          type: 'keyword',
          userDefined: false,
        },
      ]);
    });
  });
});
