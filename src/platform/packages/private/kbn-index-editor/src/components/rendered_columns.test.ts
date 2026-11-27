/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRenderedColumns } from './rendered_columns';

describe('getRenderedColumns', () => {
  it('keeps the active columns in their chosen order', () => {
    const rendered = getRenderedColumns({
      currentColumnNames: ['alpha', 'beta', 'gamma'],
      activeColumns: ['gamma', 'alpha'],
      seenColumnNames: new Set(['alpha', 'beta', 'gamma']),
    });

    expect(rendered).toEqual(['gamma', 'alpha']);
  });

  it('drops active columns that no longer exist', () => {
    const rendered = getRenderedColumns({
      currentColumnNames: ['alpha', 'gamma'],
      activeColumns: ['alpha', 'beta', 'gamma'],
      seenColumnNames: new Set(['alpha', 'beta', 'gamma']),
    });

    expect(rendered).toEqual(['alpha', 'gamma']);
  });

  it('reveals a not-yet-seen column at its canonical index', () => {
    const rendered = getRenderedColumns({
      currentColumnNames: ['alpha', 'beta', 'gamma'],
      activeColumns: ['alpha', 'gamma'],
      seenColumnNames: new Set(['alpha', 'gamma']),
    });

    expect(rendered).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('does not reveal a seen column that is not active, so a revealed field can be hidden again', () => {
    const rendered = getRenderedColumns({
      currentColumnNames: ['alpha', 'beta', 'gamma'],
      activeColumns: ['alpha', 'gamma'],
      seenColumnNames: new Set(['alpha', 'beta', 'gamma']),
    });

    expect(rendered).toEqual(['alpha', 'gamma']);
  });

  it('reveals multiple not-yet-seen columns at their canonical indices', () => {
    const rendered = getRenderedColumns({
      currentColumnNames: ['alpha', 'beta', 'gamma', 'delta'],
      activeColumns: ['alpha'],
      seenColumnNames: new Set(['alpha']),
    });

    expect(rendered).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });
});
