/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { monaco } from '../../../monaco_imports';
import { ESQLLang } from './language';

jest.mock('../promql', () => ({ PromQLLang: { onLanguage: jest.fn() } }));

it('highlights FILLNULL and its DEFAULT value', async () => {
  monaco.languages.register({ id: ESQLLang.ID });
  await ESQLLang.onLanguage?.();

  const query = 'FROM index | FILLNULL DEFAULT ON *';
  const tokens = monaco.editor.tokenize(query, ESQLLang.ID)[0];
  const typeAt = (items: monaco.Token[], offset: number) =>
    items.find((token) => token.offset === offset)?.type;

  expect(typeAt(tokens, query.indexOf('FILLNULL'))).toBe(
    'keyword.command.processing.FILLNULL.esql'
  );
  expect(typeAt(tokens, query.indexOf('DEFAULT'))).toBe('keyword.literal.DEFAULT.esql');
});
