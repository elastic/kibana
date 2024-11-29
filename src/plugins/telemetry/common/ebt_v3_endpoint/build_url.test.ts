/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBuildShipperUrl } from './build_url';

describe('buildUrl', () => {
  test('returns production URL', () => {
    const buildShipperUrl = createBuildShipperUrl('production');
    expect(buildShipperUrl({ channelName: 'test-channel' })).toBe(
      'https://telemetry.elastic.co/v3/send/test-channel'
    );
  });

  test('returns staging URL', () => {
    const buildShipperUrl = createBuildShipperUrl('staging');
    expect(buildShipperUrl({ channelName: 'test-channel' })).toBe(
      'https://telemetry-staging.elastic.co/v3/send/test-channel'
    );
  });
});
