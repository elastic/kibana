/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rewriteLegacyPath } from './setup_url_forwarding';

describe('rewriteLegacyPath', () => {
  test('should forward unrecognized sub url to listing page', () => {
    expect(rewriteLegacyPath('/dashboard')).toBe('#/list');
  });

  test('Should forward unsaved dashboard to create page', () => {
    expect(rewriteLegacyPath('/dashboard?_g=(time:(from:now-15m,to:now))')).toBe(
      '#/create?_g=(time:(from:now-15m,to:now))'
    );
  });

  test('should forward persisted dashboard to view page', () => {
    expect(rewriteLegacyPath('/dashboard/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b')).toBe(
      '#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b'
    );
  });
});
