/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  const limit = Math.sqrt(n);
  for (let i = 3; i <= limit; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

export function computePrimes(count = 500_000) {
  const primes = [];
  let candidate = 2;
  while (primes.length < count) {
    if (isPrime(candidate)) primes.push(candidate);
    candidate++;
  }
  return primes;
}
