/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCollapseRegexWithDepth } from './collapse_with_depth';

describe('createCollapseRegexWithDepth', () => {
  it('should generate regex with a base path and depth of 0', () => {
    const basePath = ['app/components'];
    const depth = 0;
    const regex = createCollapseRegexWithDepth(basePath, depth);

    expect(regex).toBe('^(app/components)');
  });

  it('should generate regex with a base path and depth of 1', () => {
    const basePath = ['src'];
    const depth = 1;
    const regex = createCollapseRegexWithDepth(basePath, depth);

    expect(regex).toBe('^(src)/([^/]+)');
  });

  it('should generate regex with a base path and depth of 2', () => {
    const basePath = ['src'];
    const depth = 2;
    const regex = createCollapseRegexWithDepth(basePath, depth);

    expect(regex).toBe('^(src)/([^/]+)/([^/]+)');
  });
});
