/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@elastic/esql';
import type { ESQLCommandSummaryContext } from '../types';
import { summary } from './summary';

const context: ESQLCommandSummaryContext = {
  namedSubqueries: [],
  getNamedSubquerySummary: () => ({ newColumns: new Set() }),
};

describe('FROM > summary', () => {
  it('returns an empty list if METADATA is not present', () => {
    const result = summary(synth.cmd`FROM index`, '', context);
    expect(result).toEqual({
      newColumns: new Set([]),
      metadataColumns: new Set([]),
      renamedColumnsPairs: new Set([]),
    });
  });

  it('returns the metadata columns if METADATA is present', () => {
    const result = summary(synth.cmd`FROM index METADATA _index, _id`, '', context);
    expect(result).toEqual({
      newColumns: new Set([]),
      metadataColumns: new Set(['_index', '_id']),
      renamedColumnsPairs: new Set([]),
    });
  });

  it('collects columns from simple subquery', () => {
    const result = summary(
      synth.cmd`FROM index1, (FROM index2 | EVAL computed = price * 2)`,
      '',
      context
    );
    expect(result).toEqual({
      newColumns: new Set(['computed']),
      metadataColumns: new Set([]),
      renamedColumnsPairs: new Set([]),
    });
  });

  it('collects columns from multiple subqueries', () => {
    const result = summary(
      synth.cmd`FROM index1, (FROM index2 | EVAL a = 1), (FROM index3 | EVAL b = 2)`,
      '',
      context
    );
    expect(result).toEqual({
      newColumns: new Set(['a', 'b']),
      metadataColumns: new Set([]),
      renamedColumnsPairs: new Set([]),
    });
  });
});
