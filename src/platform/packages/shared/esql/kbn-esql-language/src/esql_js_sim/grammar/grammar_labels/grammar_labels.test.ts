/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { GRAMMAR_LABELS } from './grammar_labels.generated';
import { readGrammarLabels } from './read_grammar';

describe('grammar labels', () => {
  it('match the installed grammar (regenerate with node scripts/generate_grammar_labels.js in @kbn/esql-language)', () => {
    expect(readGrammarLabels()).toEqual(GRAMMAR_LABELS);
  });

  it('give the tokens around each RENAME name', () => {
    const rename = GRAMMAR_LABELS.filter(({ rule }) => rule === 'renameClause').map(
      ({ label, precededBy, followedBy }) => ({ label, precededBy, followedBy })
    );

    expect(rename).toEqual([
      { label: 'oldName', precededBy: ['<start>'], followedBy: ['AS'] },
      { label: 'newName', precededBy: ['AS'], followedBy: ['<end>'] },
      { label: 'newName', precededBy: ['<start>'], followedBy: ['ASSIGN'] },
      { label: 'oldName', precededBy: ['ASSIGN'], followedBy: ['<end>'] },
    ]);
  });
});
