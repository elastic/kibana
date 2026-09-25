/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Clock } from './state_action_machine';

/**
 * A virtual clock for running a machine on virtual time: `sleep` advances the
 * clock by the requested duration, so an action completes at exactly the
 * instant the machine scheduled it for, and `advance` lets a fake action add
 * its own duration. The deadline math is exercised for real; only the clock is
 * fake.
 */
export interface VirtualClock extends Clock {
  readonly advance: (duration: number) => void;
}

export const virtualClock = (start = 0): VirtualClock => {
  let time = start;
  return {
    now: () => time,
    sleep: async (duration) => {
      time += duration;
    },
    advance: (duration) => {
      time += duration;
    },
  };
};

/** The first `count` values of an async iterable. Breaking out closes the iterable. */
export const take = async <T>(values: AsyncIterable<T>, count: number): Promise<T[]> => {
  const taken: T[] = [];
  if (count === 0) {
    return taken;
  }
  for await (const value of values) {
    taken.push(value);
    if (taken.length === count) {
      break;
    }
  }
  return taken;
};
