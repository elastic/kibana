/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapStatusCodeToBadge } from './output_highlight_rules';

describe('mapStatusCodeToBadge', () => {
  const testCases = [
    {
      description: 'treats 100 as as default',
      value: '# PUT test-index 100 Continue',
      badge: 'badge.badge--default',
    },
    {
      description: 'treats 200 as success',
      value: '# PUT test-index 200 OK',
      badge: 'badge.badge--success',
    },
    {
      description: 'treats 301 as primary',
      value: '# PUT test-index 301 Moved Permanently',
      badge: 'badge.badge--primary',
    },
    {
      description: 'treats 400 as warning',
      value: '# PUT test-index 404 Not Found',
      badge: 'badge.badge--warning',
    },
    {
      description: 'treats 502 as danger',
      value: '# PUT test-index 502 Bad Gateway',
      badge: 'badge.badge--danger',
    },
    {
      description: 'treats unexpected numbers as danger',
      value: '# PUT test-index 666 Demonic Invasion',
      badge: 'badge.badge--danger',
    },
    {
      description: 'treats no numbers as undefined',
      value: '# PUT test-index',
      badge: undefined,
    },
  ];

  testCases.forEach(({ description, value, badge }) => {
    test(description, () => {
      expect(mapStatusCodeToBadge(value)).toBe(badge);
    });
  });
});
