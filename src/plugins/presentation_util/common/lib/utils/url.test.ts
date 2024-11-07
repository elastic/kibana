/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { missingImage } from './missing_asset';
import { isValidUrl } from './url';

describe('resolve_dataurl', () => {
  it('returns valid dataurl', () => {
    expect(isValidUrl(missingImage)).toBe(true);
  });
  it('returns valid http url', () => {
    const httpurl = 'https://test.com/s/';
    expect(isValidUrl(httpurl)).toBe(true);
  });
  it('returns false for invalid url', () => {
    expect(isValidUrl('test')).toBe(false);
  });
});
