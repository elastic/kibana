/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prefixSums } from './internal_reference';
import { createIntervalScorer } from './interval_score';

describe('interval scorer scratch buffers', () => {
  it.each([1, 3, 4])('matches sorted medians with %i references for every interval', (referenceCount) => {
    const current = Array.from({ length: 48 }, (_, bucket) => bucket % 17);
    const references = Array.from({ length: referenceCount }, (_, day) =>
      Array.from({ length: 48 }, (_, bucket) => (bucket * 7 + day * 11) % 19)
    );
    const original = references.map((counts) => [...counts]);
    for (const scale of [1, 1.37]) {
      const values = current.map((count) => count * scale);
      const history = references.map((counts) => counts.map((count) => count * scale));
      const scorer = createIntervalScorer(values, history, scale === 1 ? 'counts' : 'sums');
      const observed = prefixSums(values);
      const historical = history.map(prefixSums);
      const median = (counts: number[]): number => {
        counts.sort((left, right) => left - right);
        const middle = Math.floor(counts.length / 2);
        return counts.length % 2 ? counts[middle] : counts[middle - 1] / 2 + counts[middle] / 2;
      };
      const term = (count: number, expected: number): number =>
        count === 0 ? 0 : count * Math.log(count / expected);

      for (let start = 0; start < values.length; start++) {
        for (let end = start + 1; end <= values.length; end++) {
          if (start === 0 && end === values.length) continue;
          const inside = historical.map((prefix) => prefix[end] - prefix[start]);
          const outside = historical.map((prefix, index) => prefix[values.length] - inside[index]);
          const expectedInside = median(inside);
          const expectedOutside = median(outside);
          if (expectedInside <= 0 || expectedOutside <= 0) {
            expect(scorer(start, end)).toBeNull();
            continue;
          }
          const insideCount = observed[end] - observed[start];
          const outsideCount = observed[values.length] - insideCount;
          const insideMultiplier = insideCount / expectedInside;
          const outsideMultiplier = outsideCount / expectedOutside;
          const gain =
            term(insideCount, expectedInside) + term(outsideCount, expectedOutside) -
            term(observed[values.length], expectedInside + expectedOutside);
          expect(scorer(start, end)).toEqual({
            expected: expectedInside,
            insideMultiplier,
            outsideMultiplier,
            score: insideMultiplier > outsideMultiplier ? Math.max(0, gain) : 0,
          });
        }
      }
    }
    expect(references).toEqual(original);
  });
});
