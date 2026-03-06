/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '@elastic/esql';
import { isCursorPastSources } from './resources_helpers';

const getSourceCommand = (query: string) => {
  const ast = EsqlQuery.fromSrc(query).ast;
  return ast.commands.find(({ name }) => ['from', 'ts'].includes(name))!;
};

describe('isCursorPastSources', () => {
  test('returns false when cursor is at the end of a partial source name', () => {
    const query = 'FROM k';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(false);
  });

  test('returns false when cursor is at the end of a full source name without trailing space', () => {
    const query = 'FROM logs-*';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(false);
  });

  test('returns true when there is a trailing space after the source', () => {
    const query = 'FROM logs-* ';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(true);
  });

  test('returns true with multiple sources when cursor is past the last one', () => {
    const query = 'FROM logs-*, metrics-* ';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(true);
  });

  test('returns false with multiple sources when cursor is at the end of the last one', () => {
    const query = 'FROM logs-*, metrics-*';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(false);
  });

  test('returns false when the command has no source nodes', () => {
    const query = 'FROM ';
    expect(isCursorPastSources(getSourceCommand(query), query.length)).toBe(false);
  });
});
