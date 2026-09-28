/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// cyrb128 string hash, then the sfc32 generator: the same search always draws the same calibration.
const hashSeed = (seed: string): [number, number, number, number] => {
  let first = 1779033703;
  let second = 3144134277;
  let third = 1013904242;
  let fourth = 2773480762;
  for (let index = 0; index < seed.length; index++) {
    const code = seed.charCodeAt(index);
    first = second ^ Math.imul(first ^ code, 597399067);
    second = third ^ Math.imul(second ^ code, 2869860233);
    third = fourth ^ Math.imul(third ^ code, 951274213);
    fourth = first ^ Math.imul(fourth ^ code, 2716044179);
  }
  first = Math.imul(third ^ (first >>> 18), 597399067);
  second = Math.imul(fourth ^ (second >>> 22), 2869860233);
  third = Math.imul(first ^ (third >>> 17), 951274213);
  fourth = Math.imul(second ^ (fourth >>> 19), 2716044179);

  return [
    (first ^ second ^ third ^ fourth) >>> 0,
    (second ^ first) >>> 0,
    (third ^ first) >>> 0,
    (fourth ^ first) >>> 0,
  ];
};

/** Returns a deterministic generator of numbers in [0, 1) for the given seed. */
export const createSeededRandom = (seed: string): (() => number) => {
  let [first, second, third, fourth] = hashSeed(seed);

  return () => {
    first >>>= 0;
    second >>>= 0;
    third >>>= 0;
    fourth >>>= 0;
    let result = (first + second) | 0;
    first = second ^ (second >>> 9);
    second = (third + (third << 3)) | 0;
    third = (third << 21) | (third >>> 11);
    fourth = (fourth + 1) | 0;
    result = (result + fourth) | 0;
    third = (third + result) | 0;

    return (result >>> 0) / 4294967296;
  };
};
