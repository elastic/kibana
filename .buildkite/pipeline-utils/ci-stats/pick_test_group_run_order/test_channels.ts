/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * NOTE: This is a local mirror of the channel vocabulary defined in
 * src/platform/packages/private/kbn-scout-info/src/test_channels.ts.
 *
 * Pipeline-gen runs with KBN_BOOTSTRAP_NO_PREBUILT=true and deliberately
 * imports zero @kbn/* runtime packages, so we cannot import @kbn/scout-info
 * directly. Keep the channel list and semantics in sync with that module.
 */
const COMPLETE_CHANNEL_LIST = [
  'ci-on-commit',
  'ci-batch-3h',
  'ci-batch-daily',
  'ci-batch-weekly',
] as const;

export type FTRTestChannel = (typeof COMPLETE_CHANNEL_LIST)[number];

export const ftrTestChannels: {
  all: Set<FTRTestChannel>;
  default: Set<FTRTestChannel>;
} = {
  all: new Set(COMPLETE_CHANNEL_LIST),
  default: new Set(['ci-on-commit', 'ci-batch-3h']),
};

export const ftrTestChannel = {
  fromString(input: string): FTRTestChannel {
    const matchingChannel = ftrTestChannels.all.values().find((channel) => channel === input);

    if (matchingChannel === undefined) {
      throw new Error(
        `Failed to find matching FTR test channel for string '${input}'` +
          `. Valid channels: ${ftrTestChannels.all.values().toArray().join(', ')}`
      );
    }

    return matchingChannel!;
  },
};
