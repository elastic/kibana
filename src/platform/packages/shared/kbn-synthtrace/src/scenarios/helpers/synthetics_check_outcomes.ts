/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type CheckOutcome = 'up' | 'down';

export type OutcomePattern =
  /** Every check passes. */
  | { type: 'healthy' }
  /** Every check fails. */
  | { type: 'down' }
  /** The monitor passes, then fails for its last `downChecks` checks. */
  | { type: 'outage'; downChecks: number }
  /**
   * The outcome flips between up and down, with `flipProbability` (0 to 1, default 0.4) of
   * changing at each check. It always changes at least once when there are two or more checks.
   */
  | { type: 'flapping'; flipProbability?: number };

const DEFAULT_FLIP_PROBABILITY = 0.4;

const opposite = (outcome: CheckOutcome): CheckOutcome => (outcome === 'up' ? 'down' : 'up');

const getFlappingOutcomes = (
  count: number,
  random: () => number,
  flipProbability: number
): CheckOutcome[] => {
  const outcomes: CheckOutcome[] = [];
  let current: CheckOutcome = random() < 0.5 ? 'up' : 'down';

  for (let index = 0; index < count; index++) {
    if (index > 0 && random() < flipProbability) {
      current = opposite(current);
    }
    outcomes.push(current);
  }

  if (count > 1 && outcomes.every((outcome) => outcome === outcomes[0])) {
    outcomes[count - 1] = opposite(outcomes[0]);
  }

  return outcomes;
};

/**
 * Returns the outcome of `count` consecutive checks of a monitor, oldest first. The same
 * `random` sequence (see `createSeededRandom`) always gives the same outcomes.
 */
export const getCheckOutcomes = ({
  pattern,
  count,
  random,
}: {
  pattern: OutcomePattern;
  count: number;
  random: () => number;
}): CheckOutcome[] => {
  switch (pattern.type) {
    case 'healthy':
      return Array.from({ length: count }, () => 'up');
    case 'down':
      return Array.from({ length: count }, () => 'down');
    case 'outage': {
      const downChecks = Math.min(Math.max(pattern.downChecks, 0), count);
      return Array.from({ length: count }, (_, index) =>
        index >= count - downChecks ? 'down' : 'up'
      );
    }
    case 'flapping':
      return getFlappingOutcomes(
        count,
        random,
        pattern.flipProbability ?? DEFAULT_FLIP_PROBABILITY
      );
  }
};

/**
 * The outcome of the check after `outcomes`. Healthy, down and outage continue the last
 * outcome: an outage is the last checks of the original range, and laying that pattern out
 * again for a longer count would move it. Flapping keeps flipping. `random` must be the
 * generator already used to lay `outcomes` out, so the draws continue instead of restarting.
 */
export const nextCheckOutcome = (
  pattern: OutcomePattern,
  outcomes: CheckOutcome[],
  random: () => number
): CheckOutcome => {
  const last = outcomes[outcomes.length - 1];
  if (pattern.type !== 'flapping') {
    return last;
  }

  const flipProbability = pattern.flipProbability ?? DEFAULT_FLIP_PROBABILITY;
  return random() < flipProbability ? opposite(last) : last;
};

/** A passing check takes 100-500 ms, a failing one 5-10 s (a timeout). */
export const getCheckDurationUs = (outcome: CheckOutcome, random: () => number): number =>
  outcome === 'up'
    ? Math.floor(100_000 + random() * 400_000)
    : Math.floor(5_000_000 + random() * 5_000_000);
