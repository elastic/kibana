/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildUrl } from './build_url';

describe('buildUrl', () => {
  test('returns production URL', () => {
    expect(buildUrl('production', 'test-channel')).toBe(
      'https://telemetry.elastic.co/v3/send/test-channel'
    );
  });

  test('returns staging URL', () => {
    expect(buildUrl('staging', 'test-channel')).toBe(
      'https://telemetry-staging.elastic.co/v3/send/test-channel'
    );
  });
});
