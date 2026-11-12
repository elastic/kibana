/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getCallSites } from './call_sites';
import { GRAMMAR_LABELS } from './grammar_labels.generated';

describe('getCallSites', () => {
  it('agrees with the generated table on every labelled call', () => {
    const mismatched = GRAMMAR_LABELS.filter(
      (label) =>
        !getCallSites(label.rule, label.invokes).some(
          (site) =>
            site.state === label.state &&
            site.label === label.label &&
            site.precededBy.join() === label.precededBy.join() &&
            site.followedBy.join() === label.followedBy.join()
        )
    );

    expect(mismatched).toEqual([]);
  });

  it('finds unlabelled calls, with the tokens around each', () => {
    expect(
      getCallSites('grokCommand', 'string').map(({ label, precededBy, followedBy }) => ({
        label,
        precededBy,
        followedBy,
      }))
    ).toEqual([
      { label: undefined, precededBy: ['<primaryExpression>'], followedBy: ['<end>', 'COMMA'] },
      { label: undefined, precededBy: ['COMMA'], followedBy: ['<end>', 'COMMA'] },
    ]);
  });

  it('finds nothing for a rule the grammar does not call there', () => {
    expect(getCallSites('grokCommand', 'qualifiedName')).toEqual([]);
  });
});
