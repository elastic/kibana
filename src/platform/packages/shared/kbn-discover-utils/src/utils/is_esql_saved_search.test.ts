/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEsqlSavedSearch } from './is_esql_saved_search';

describe('isEsqlSavedSearch', () => {
  it('returns true when the first tab is ES|QL', () => {
    expect(
      isEsqlSavedSearch({
        attributes: { tabs: [{ attributes: { isTextBasedQuery: true } }] },
      })
    ).toBe(true);
  });

  it('returns false when the first tab is not ES|QL', () => {
    expect(
      isEsqlSavedSearch({
        attributes: { tabs: [{ attributes: { isTextBasedQuery: false } }] },
      })
    ).toBe(false);
  });

  it('returns false when the first tab has no isTextBasedQuery flag', () => {
    expect(
      isEsqlSavedSearch({
        attributes: { tabs: [{ attributes: {} }] },
      })
    ).toBe(false);
  });

  it('returns false when the saved object has no tabs', () => {
    expect(isEsqlSavedSearch({ attributes: {} })).toBe(false);
  });

  it('only inspects the first tab', () => {
    expect(
      isEsqlSavedSearch({
        attributes: {
          tabs: [
            { attributes: { isTextBasedQuery: false } },
            { attributes: { isTextBasedQuery: true } },
          ],
        },
      })
    ).toBe(false);
  });

  it('ignores legacy root-level isTextBasedQuery and reads from the first tab', () => {
    // Legacy v12 docs had `isTextBasedQuery` at the root of attributes;
    // model version 13 removes it, leaving only `tabs[i].attributes.isTextBasedQuery`.
    const savedObject = {
      attributes: {
        isTextBasedQuery: true,
        tabs: [{ attributes: { isTextBasedQuery: false } }],
      },
    };

    expect(isEsqlSavedSearch(savedObject)).toBe(false);
  });
});
