/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

/**
 * Built from the real parser rather than a hand-rolled object: the three naming forms are
 * distinguished by which AST fields the parser populates, so a fake would be free to disagree
 * with it.
 */
const parseCommand = (denseVectorClause: string): ESQLCommand => {
  const { root, errors } = Parser.parse(`FROM books | ${denseVectorClause}`);

  expect(errors).toEqual([]);

  return root.commands.find(({ name }) => name === 'dense_vector') as ESQLCommand;
};

const namesOf = (columns: ESQLColumnData[]) => columns.map(({ name }) => name);

describe('DENSE_VECTOR > columnsAfter', () => {
  describe('default suffix', () => {
    it('appends one dense_vector column per field', () => {
      const result = columnsAfter(parseCommand('DENSE_VECTOR title, body'), []);

      expect(namesOf(result)).toEqual(['title_dense_vector', 'body_dense_vector']);
      expect(result.every(({ type, userDefined }) => type === 'dense_vector' && !userDefined)).toBe(
        true
      );
    });

    // `ROW some_text = "..." | DENSE_VECTOR some_text` — the input does not have to be an
    // index field.
    it('embeds a column computed earlier in the pipeline', () => {
      const previous: ESQLColumnData[] = [
        { name: 'some_text', type: 'keyword', userDefined: true, location: { min: 0, max: 10 } },
      ];
      const result = columnsAfter(parseCommand('DENSE_VECTOR some_text'), previous);

      expect(namesOf(result)).toEqual(['some_text', 'some_text_dense_vector']);
      expect(result[1].type).toBe('dense_vector');
    });

    it('preserves the source fields and appends after them', () => {
      const previous: ESQLColumnData[] = [
        { name: 'title', type: 'text', userDefined: false },
        { name: 'count', type: 'integer', userDefined: false },
      ];
      const result = columnsAfter(parseCommand('DENSE_VECTOR title'), previous);

      expect(namesOf(result)).toEqual(['title', 'count', 'title_dense_vector']);
    });
  });

  describe('custom suffix', () => {
    it('applies the suffix to every field in the ON list', () => {
      const result = columnsAfter(parseCommand('DENSE_VECTOR suffix = "_dv" ON title, body'), []);

      expect(namesOf(result)).toEqual(['title_dv', 'body_dv']);
      expect(result.every(({ type }) => type === 'dense_vector')).toBe(true);
    });

    it('overwrites the source column when the suffix is empty', () => {
      const previous: ESQLColumnData[] = [{ name: 'title', type: 'text', userDefined: false }];
      const result = columnsAfter(parseCommand('DENSE_VECTOR suffix = "" ON title'), previous);

      expect(namesOf(result)).toEqual(['title']);
      expect(result[0].type).toBe('dense_vector');
    });
  });

  describe('explicit target name', () => {
    it('names the single generated column after the target', () => {
      const result = columnsAfter(parseCommand('DENSE_VECTOR vec = description'), []);

      expect(namesOf(result)).toEqual(['vec']);
      expect(result[0].type).toBe('dense_vector');
    });

    // The user named this column, so it is user-defined — the same split COMPLETION and RERANK
    // make. Marking it as a plain field would rank it as one and offer it as an ENRICH match.
    it('marks a named column as user-defined, unlike a suffixed one', () => {
      const [named] = columnsAfter(parseCommand('DENSE_VECTOR vec = description'), []);
      expect(named.userDefined).toBe(true);

      const [suffixed] = columnsAfter(parseCommand('DENSE_VECTOR description'), []);
      expect(suffixed.userDefined).toBe(false);
    });

    it('replaces an existing column of the same name', () => {
      const previous: ESQLColumnData[] = [{ name: 'vec', type: 'keyword', userDefined: false }];
      const result = columnsAfter(parseCommand('DENSE_VECTOR vec = description'), previous);

      expect(namesOf(result)).toEqual(['vec']);
      expect(result[0].type).toBe('dense_vector');
    });
  });

  describe('nothing to generate', () => {
    it('leaves the columns untouched when no field is given', () => {
      const previous: ESQLColumnData[] = [{ name: 'count', type: 'integer', userDefined: false }];
      const result = columnsAfter(parseCommand('DENSE_VECTOR'), previous);

      expect(namesOf(result)).toEqual(['count']);
    });
  });
});
