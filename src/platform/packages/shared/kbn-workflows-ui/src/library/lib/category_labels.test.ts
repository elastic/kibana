/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCategoryLabel } from './category_labels';

describe('getCategoryLabel', () => {
  it('should return the vocabulary name for a known single-word category id', () => {
    expect(getCategoryLabel('detection')).toBe('Detection');
  });

  it('should return the vocabulary name for a known multi-word category id', () => {
    expect(getCategoryLabel('threat-intel')).toBe('Threat intelligence');
    expect(getCategoryLabel('root-cause-analysis')).toBe('Root cause analysis');
  });

  it('should fall back to a humanized id for an unknown category', () => {
    expect(getCategoryLabel('brand-new-category')).toBe('Brand New Category');
  });
});
