/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { esqlCommandRegistry } from '../..';
import { QueryColumns } from '.';

const sourceColumns = [
  { name: 'title', type: 'text', userDefined: false },
  { name: 'author', type: 'keyword', userDefined: false },
  { name: 'year', type: 'integer', userDefined: false },
  { name: '_id', type: 'keyword', userDefined: false },
];

const callbacks = {
  getColumnsFor: async () => sourceColumns,
} as unknown as ESQLCallbacks;

const getColumns = async (query: string) => {
  const { root } = Parser.parse(query);
  const columns = await new QueryColumns(root, query, callbacks, {
    invalidateColumnsCache: true,
  }).asMap();

  return [...columns.values()];
};

const getMarkedColumns = async (query: string): Promise<Record<string, string>> => {
  const columns = await getColumns(query);

  return Object.fromEntries(
    columns
      .filter(({ fullTextMatch }) => fullTextMatch !== undefined)
      .map(({ name, fullTextMatch }) => [name, fullTextMatch as string])
  );
};

const getHighlightColumns = async (query: string): Promise<string[]> =>
  (await getColumns(query)).map(({ name }) => name).filter((name) => name.startsWith('highlight_'));

describe('full-text match marks on columns', () => {
  describe('WHERE', () => {
    it('marks the column a positive MATCH targets, and ignores other filters', async () => {
      expect(
        await getMarkedColumns('FROM books | WHERE MATCH(title, "Return") AND year > 2020')
      ).toEqual({ title: 'field' });
    });

    it('marks the column of the match operator and MATCH_PHRASE', async () => {
      expect(
        await getMarkedColumns('FROM books | WHERE author : "x" AND MATCH_PHRASE(title, "y")')
      ).toEqual({
        author: 'field',
        title: 'field',
      });
    });

    it('marks every column for a condition that names no field', async () => {
      const allColumns = { title: 'all', author: 'all', year: 'all', _id: 'all' };

      expect(await getMarkedColumns('FROM books | WHERE QSTR("Return")')).toEqual(allColumns);
      expect(await getMarkedColumns('FROM books | WHERE KQL("title: x")')).toEqual(allColumns);
    });

    it('does not mark a negated condition, or one mixed with other filters', async () => {
      expect(await getMarkedColumns('FROM books | WHERE NOT MATCH(title, "x")')).toEqual({});
      expect(await getMarkedColumns('FROM books | WHERE MATCH(title, "x") OR year > 2020')).toEqual(
        {}
      );
    });

    it('marks both sides of an OR of full-text conditions', async () => {
      expect(
        await getMarkedColumns('FROM books | WHERE MATCH(title, "x") OR MATCH(author, "y")')
      ).toEqual({ title: 'field', author: 'field' });
    });

    it('combines the conditions of several WHERE commands', async () => {
      expect(
        await getMarkedColumns(
          'FROM books | WHERE MATCH(title, "x") | WHERE year > 1 | WHERE MATCH(author, "y")'
        )
      ).toEqual({ title: 'field', author: 'field' });
    });
  });

  describe('commands in between', () => {
    it('keeps the marks through doc-preserving commands', async () => {
      expect(
        await getMarkedColumns(
          'FROM books | WHERE MATCH(title, "x") | EVAL n = year + 1 | SORT year | LIMIT 5 | INLINE STATS c = COUNT(*) | KEEP title, year, c'
        )
      ).toEqual({ title: 'field' });
    });

    it('moves the mark with a renamed column', async () => {
      expect(
        await getMarkedColumns('FROM books | WHERE MATCH(title, "x") | RENAME title AS name')
      ).toEqual({ name: 'field' });
      expect(
        await getMarkedColumns('FROM books | WHERE MATCH(title, "x") | RENAME name = title')
      ).toEqual({ name: 'field' });
    });

    it('drops the mark of a dropped column', async () => {
      expect(await getMarkedColumns('FROM books | WHERE MATCH(title, "x") | DROP title')).toEqual(
        {}
      );
    });

    it('drops the mark of a redefined column', async () => {
      expect(
        await getMarkedColumns(
          'FROM books | WHERE MATCH(title, "x") | EVAL title = CONCAT(title, "!")'
        )
      ).toEqual({});
    });

    it('drops the marks after a command that does not preserve documents', async () => {
      expect(
        await getMarkedColumns('FROM books | WHERE MATCH(title, "x") | STATS c = COUNT(*) BY title')
      ).toEqual({});
    });
  });

  describe('HIGHLIGHT without a query or ON', () => {
    it('generates the column of the field the WHERE targets', async () => {
      expect(
        await getHighlightColumns('FROM books | WHERE MATCH(title, "x") AND year > 1 | HIGHLIGHT')
      ).toEqual(['highlight_title']);
    });

    it('follows a renamed field', async () => {
      expect(
        await getHighlightColumns(
          'FROM books | WHERE MATCH(title, "x") | RENAME title AS name | HIGHLIGHT'
        )
      ).toEqual(['highlight_name']);
    });

    it('generates a column for every text column when the WHERE names no field', async () => {
      expect(await getHighlightColumns('FROM books | WHERE QSTR("x") | HIGHLIGHT')).toEqual([
        'highlight_title',
        'highlight_author',
      ]);
    });

    it('also reaches text columns created after a condition that names no field', async () => {
      expect(
        await getHighlightColumns(
          'FROM books | WHERE QSTR("x") | EVAL label = TO_STRING(year) | HIGHLIGHT'
        )
      ).toContain('highlight_label');
    });

    it('reaches new text columns even after every earlier text column is removed', async () => {
      expect(
        await getHighlightColumns(
          'FROM books | WHERE QSTR("x") | KEEP year | EVAL label = TO_STRING(year) | HIGHLIGHT'
        )
      ).toEqual(['highlight_label']);
    });

    it('combines the fields of several WHERE commands', async () => {
      expect(
        await getHighlightColumns(
          'FROM books | WHERE MATCH(title, "x") | WHERE MATCH(author, "y") | HIGHLIGHT'
        )
      ).toEqual(['highlight_title', 'highlight_author']);
    });

    it('generates nothing when the WHERE has no reusable full-text condition', async () => {
      expect(
        await getHighlightColumns('FROM books | WHERE NOT MATCH(title, "x") | HIGHLIGHT')
      ).toEqual([]);
      expect(await getHighlightColumns('FROM books | WHERE author == "x" | HIGHLIGHT')).toEqual([]);
      expect(
        await getHighlightColumns('FROM books | WHERE author IS NOT NULL | HIGHLIGHT')
      ).toEqual([]);
    });

    it('generates nothing after a command that does not preserve documents', async () => {
      expect(
        await getHighlightColumns(
          'FROM books | WHERE MATCH(title, "x") | STATS c = COUNT(*) BY title | HIGHLIGHT'
        )
      ).toEqual([]);
    });

    it('generates nothing for a dropped field', async () => {
      expect(
        await getHighlightColumns('FROM books | WHERE MATCH(title, "x") | DROP title | HIGHLIGHT')
      ).toEqual([]);
    });

    it('generates every text column when the WHERE targets a parameter', async () => {
      expect(
        await getHighlightColumns('FROM books | WHERE MATCH(?field, "x") | HIGHLIGHT')
      ).toEqual(['highlight_title', 'highlight_author']);
      expect(await getHighlightColumns('FROM books | WHERE ??field : "x" | HIGHLIGHT')).toEqual([
        'highlight_title',
        'highlight_author',
      ]);
    });

    it('does not use the marks when ON is given', async () => {
      expect(
        await getHighlightColumns('FROM books | WHERE MATCH(title, "x") | HIGHLIGHT ON author')
      ).toEqual(['highlight_author']);
    });
  });

  describe('doc-preserving commands', () => {
    // Mirrors the commands of Elasticsearch that keep each row tied to one document. STATS, FORK,
    // FUSE, LOOKUP JOIN and the source commands are deliberately left out.
    it('flags the commands that keep each row tied to one document', () => {
      const docPreserving = esqlCommandRegistry
        .getAllCommandNames()
        .filter((name) => esqlCommandRegistry.getCommandByName(name)?.metadata.docPreserving)
        .sort();

      expect(docPreserving).toEqual(
        [
          'change_point',
          'completion',
          'dedup',
          'dense_vector',
          'dissect',
          'drop',
          'enrich',
          'eval',
          'grok',
          'highlight',
          'inline stats',
          'ip_location',
          'keep',
          'limit',
          'mmr',
          'mv_expand',
          'registered_domain',
          'rename',
          'rerank',
          'sample',
          'sort',
          'uri_parts',
          'user_agent',
          'where',
        ].sort()
      );
    });
  });
});
