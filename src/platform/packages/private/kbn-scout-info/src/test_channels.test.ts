/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { testChannels } from './test_channels';

describe('scoutTestChannels', () => {
  const originalScoutTestChannels = process.env.SCOUT_TEST_CHANNELS;

  afterEach(() => {
    if (originalScoutTestChannels === undefined) {
      delete process.env.SCOUT_TEST_CHANNELS;
    } else {
      process.env.SCOUT_TEST_CHANNELS = originalScoutTestChannels;
    }
  });

  it('returns default channels when SCOUT_TEST_CHANNELS is not set', () => {
    delete process.env.SCOUT_TEST_CHANNELS;

    expect(testChannels.current()).toEqual(testChannels.default);
  });

  it('returns all channels when SCOUT_TEST_CHANNELS is all', () => {
    process.env.SCOUT_TEST_CHANNELS = 'all';

    expect(testChannels.current()).toEqual(testChannels.all);
  });

  it('returns channels matching comma-separated regular expressions', () => {
    process.env.SCOUT_TEST_CHANNELS = 'ci-on-commit,ci-batch-.*';

    expect(testChannels.current()).toEqual([
      'ci-on-commit',
      ...testChannels.all.filter((channel) => channel.startsWith('ci-batch-')),
    ]);
  });

  it('throws when all is combined with another selector', () => {
    process.env.SCOUT_TEST_CHANNELS = 'all,ci-batch-daily';

    expect(() => testChannels.current()).toThrow(
      "the 'all' keyword, if specified, can only be used on its own"
    );
  });

  it('throws when a selector does not match any channel', () => {
    process.env.SCOUT_TEST_CHANNELS = 'ci-batch-weekly,ci-batch-fortnightly';

    expect(() => testChannels.current()).toThrow(
      "Couldn't find any Scout test channels matching the regular expression '/^ci-batch-fortnightly$/'"
    );
  });
});
