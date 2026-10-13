/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectRecommendedQueries } from './select_recommended_queries';

const query = (label: string) => ({ label, description: '', queryString: `FROM logs | ${label}` });
const queries = (...labels: string[]) => labels.map(query);
const labels = (items: Array<{ label: string }>) => items.map((item) => item.label);

describe('selectRecommendedQueries', () => {
  it('keeps the order of the static queries and caps them', () => {
    expect(
      labels(
        selectRecommendedQueries({
          extensionQueries: [],
          staticQueries: queries('s1', 's2', 's3', 's4', 's5', 's6', 's7'),
          sourceCommand: 'FROM',
        })
      )
    ).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
  });

  it('puts the extension queries before the static ones', () => {
    expect(
      labels(
        selectRecommendedQueries({
          extensionQueries: queries('e1'),
          staticQueries: queries('s1', 's2'),
          sourceCommand: 'FROM',
        })
      )
    ).toEqual(['e1', 's1', 's2']);
  });

  it('keeps two static queries visible when many extension queries match a FROM source', () => {
    expect(
      labels(
        selectRecommendedQueries({
          extensionQueries: queries('e1', 'e2', 'e3', 'e4', 'e5'),
          staticQueries: queries('s1', 's2', 's3'),
          sourceCommand: 'FROM',
        })
      )
    ).toEqual(['e1', 'e2', 'e3', 'e4', 's1', 's2']);
  });

  it('gives all the slots to the extension queries of a TS source', () => {
    expect(
      labels(
        selectRecommendedQueries({
          extensionQueries: queries('e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'),
          staticQueries: queries('s1', 's2'),
          sourceCommand: 'TS',
        })
      )
    ).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
  });

  it('fills the slots a TS source leaves with the static queries', () => {
    expect(
      labels(
        selectRecommendedQueries({
          extensionQueries: queries('e1'),
          staticQueries: queries('s1', 's2', 's3', 's4', 's5', 's6'),
          sourceCommand: 'TS',
        })
      )
    ).toEqual(['e1', 's1', 's2', 's3', 's4', 's5']);
  });
});
