/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRecommendedQueriesTemplates } from '.';

describe('getRecommendedQueriesTemplates', () => {
  it('does not append the load-unmapped template when fromCommand is empty', () => {
    const withFrom = getRecommendedQueriesTemplates({ fromCommand: 'FROM x' });
    const emptyFrom = getRecommendedQueriesTemplates({ fromCommand: '' });

    expect(withFrom.find((q) => q.label === 'Load unmapped fields')).toBeDefined();
    expect(emptyFrom.find((q) => q.label === 'Load unmapped fields')).toBeUndefined();
  });
});
