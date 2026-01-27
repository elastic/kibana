/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import { summary } from './summary';

describe('RERANK summary', () => {
  it('returns _score as new column when no target field is specified', () => {
    const command = synth.cmd`RERANK "query" ON field`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['_score']));
  });

  it('returns target field as new column when specified', () => {
    const command = synth.cmd`RERANK my_score = "query" ON field`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['my_score']));
  });
});
