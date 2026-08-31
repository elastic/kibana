/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('node:fs', () => ({
  readFileSync: jest.fn(),
}));

import { readFileSync } from 'node:fs';
import { ftrManifest } from './ftr_manifests';
import { ftrTestChannel } from './test_channels';

describe('ftrTestChannel.fromString', () => {
  it('throws for an unknown channel', () => {
    expect(() => ftrTestChannel.fromString('not-a-channel')).toThrow(
      "Failed to find matching FTR test channel for string 'not-a-channel'"
    );
  });
});

describe('ftrManifest.entries.fromFile', () => {
  it('applies queue and testChannels overrides from an object-form entry', () => {
    (readFileSync as jest.Mock).mockReturnValueOnce(`
enabled:
  - some/config.ts:
      queue: n2-8-spot
      testChannels:
        - ci-batch-daily
`);

    const [entry] = ftrManifest.entries.fromFile('ftr_security_stateful_configs.yml');

    expect(entry.queue).toBe('n2-8-spot');
    expect(entry.testChannels).toEqual(new Set(['ci-batch-daily']));
  });
});
