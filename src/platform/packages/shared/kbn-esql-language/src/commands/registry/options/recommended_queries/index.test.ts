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
  it('Load unmapped fields template', () => {
    const withFrom = getRecommendedQueriesTemplates({ fromCommand: 'FROM x' });
    const emptyFrom = getRecommendedQueriesTemplates({ fromCommand: '' });

    const unmappedFieldsTemplate = withFrom.find((q) => q.label === 'Load unmapped fields');
    expect(unmappedFieldsTemplate).toBeDefined();
    expect(unmappedFieldsTemplate?.queryString).toBe(`SET unmapped_fields = "LOAD";\nFROM x`);

    expect(emptyFrom.find((q) => q.label === 'Load unmapped fields')).toBeUndefined();
  });
});
