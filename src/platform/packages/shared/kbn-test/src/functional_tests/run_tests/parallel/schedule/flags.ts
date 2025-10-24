/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import { z } from '@kbn/zod';
import type { ScheduleConfigOptions } from './types';

export const SCHEDULE_FLAG_OPTIONS = {
  string: ['options'],
  help: `
    --options             
    --max-duration-mins   Max duration of a worker, in minutes
  `,
} satisfies FlagOptions;

const schema = z.object({
  configs: z.array(
    z.object({
      path: z.string(),
      testDurationMins: z.number(),
    })
  ),
  maxDurationMins: z.number(),
  machines: z.array(
    z.object({
      name: z.string(),
      cpus: z.number(),
      memoryMb: z.number(),
    })
  ),
});

export function parseFlags(flags: FlagsReader): ScheduleConfigOptions {
  try {
    const options = flags.requiredString('options');
    const parsed = JSON.parse(options);
    return schema.parse(parsed);
  } catch (err) {
    throw new Error(`Failed to parse --options`, { cause: err });
  }
}
