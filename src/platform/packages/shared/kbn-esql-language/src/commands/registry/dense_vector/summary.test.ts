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
import { summary } from './summary';

const parseCommand = (denseVectorClause: string): ESQLCommand => {
  const { root, errors } = Parser.parse(`FROM books | ${denseVectorClause}`);

  expect(errors).toEqual([]);

  return root.commands.find(({ name }) => name === 'dense_vector') as ESQLCommand;
};

const summaryOf = (denseVectorClause: string) =>
  summary(parseCommand(denseVectorClause), `FROM books | ${denseVectorClause}`);

describe('DENSE_VECTOR > summary', () => {
  it('reports one suffixed column per field', () => {
    expect(summaryOf('DENSE_VECTOR title, body')).toEqual({
      newColumns: new Set(['title_dense_vector', 'body_dense_vector']),
    });
  });

  it('applies a custom suffix', () => {
    expect(summaryOf('DENSE_VECTOR suffix = "_dv" ON title, body')).toEqual({
      newColumns: new Set(['title_dv', 'body_dv']),
    });
  });

  it('reports the target name for an explicitly named output', () => {
    expect(summaryOf('DENSE_VECTOR vec = description')).toEqual({
      newColumns: new Set(['vec']),
    });
  });

  it('reports nothing when no field is given', () => {
    expect(summaryOf('DENSE_VECTOR')).toEqual({ newColumns: new Set() });
  });
});
