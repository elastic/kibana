/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodError } from '@kbn/zod';

export const ScoutTestChannelSchema = z.enum([
  'ci-on-commit', // Immediate feedback, as soon as the change is committed.
  'ci-batch-3h', // Scheduled every 3 hours; slower but timely feedback to changes.
  'ci-batch-daily', // Scheduled once per day; benchmarks or test that target code areas with dormant or low churn.
  'ci-batch-weekly', // Scheduled once per week; for large-scale / long-running tests.
]);
export type ScoutTestChannel = z.infer<typeof ScoutTestChannelSchema>;
export type ScoutTestChannelsDefinition = ScoutTestChannel[];

export const testChannel = {
  fromString(raw: string): ScoutTestChannel {
    try {
      return ScoutTestChannelSchema.parse(raw);
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = e.issues.map((issue) => issue.message);
        e.message = `Failed to parse the string '${raw}' as a Scout test channel:`;
        e.message += `\n- ${issues.join('\n- ')}`;
      }

      throw e;
    }
  },
};

export const testChannels: {
  all: ScoutTestChannel[];
  default: ScoutTestChannel[];
  match(pattern: RegExp): ScoutTestChannel[];
  current(): ScoutTestChannel[];
} = {
  all: ScoutTestChannelSchema.options,
  default: ['ci-on-commit', 'ci-batch-3h'],
  match(pattern) {
    return this.all.filter((channel) => channel.match(pattern));
  },
  current() {
    if (
      process.env.SCOUT_TEST_CHANNELS === undefined ||
      process.env.SCOUT_TEST_CHANNELS.trim().length === 0
    ) {
      return this.default;
    }

    const rawChannels = process.env.SCOUT_TEST_CHANNELS.split(',');

    if (rawChannels.length === 1 && rawChannels[0] === 'all') {
      return this.all;
    }

    if (rawChannels.length > 0 && rawChannels.includes('all')) {
      throw new Error(
        "Invalid Scout test channel selection: the 'all' keyword, if specified, can only be used on its own" +
          `; got: ${rawChannels.join(', ')}`
      );
    }

    return rawChannels
      .map((rawChannel) => RegExp(`^${rawChannel}$`))
      .flatMap((pattern) => {
        const matches = this.match(pattern);

        if (matches.length === 0) {
          throw new Error(
            `Couldn't find any Scout test channels matching the regular expression '${pattern}'` +
              `; valid channels: ${this.all.join(', ')}`
          );
        }

        return matches;
      });
  },
};
