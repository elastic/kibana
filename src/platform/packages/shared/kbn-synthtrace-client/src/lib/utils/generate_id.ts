/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type IdGeneratorStrategyType = 'random' | 'sequential';

let seq = 0;
let idGeneratorStategy: IdGeneratorStrategyType = 'sequential';

const pid = String(process.pid);

const LONG_ID_LENGTH = 32;
const SHORT_ID_LENGTH = 16;
const UNIQUE_ID_MAX_SEQ = 10_000_000;

function generateSequentialId(length: number = LONG_ID_LENGTH) {
  const id = String(seq++);
  const generatedId = pid + id.padStart(length - pid.length, '0');
  if (generatedId.length > length) {
    throw new Error(`generated id is longer than ${length} characters: ${generatedId.length}`);
  }

  return generatedId;
}

function generateRandomId(length: number = LONG_ID_LENGTH) {
  seq = (seq + 1) % UNIQUE_ID_MAX_SEQ;

  const randomFactor = Math.floor(Math.random() * UNIQUE_ID_MAX_SEQ);
  const randomHex = (randomFactor * Date.now() * seq).toString(16);

  const generatedId = `${randomHex}${String(seq).padStart(
    length - randomHex.length,
    '0'
  )}`.substring(0, length);

  if (generatedId.length > length) {
    throw new Error(`generated id is longer than ${length} characters: ${generatedId.length}`);
  }

  return generatedId;
}

function generateIdWithSeed(seed: string, length: number = LONG_ID_LENGTH) {
  // this is needed to sanitize errors like "No handler for /order/{id}",
  // as encodeURIComponent is not enough and can cause errors in the client
  const encodedSeed = seed.replace(/[/]/g, '_').replace(/[{}]/g, '');
  return encodedSeed?.padStart(length, '0');
}

export function generateShortId() {
  return idGeneratorStategy === 'random'
    ? generateRandomId(SHORT_ID_LENGTH)
    : generateSequentialId(SHORT_ID_LENGTH);
}

export function generateLongId() {
  return idGeneratorStategy === 'random'
    ? generateRandomId(LONG_ID_LENGTH)
    : generateSequentialId(LONG_ID_LENGTH);
}

export function generateLongIdWithSeed(seed: string) {
  return generateIdWithSeed(seed, LONG_ID_LENGTH);
}

export const setIdGeneratorStrategy = (strategy: IdGeneratorStrategyType) => {
  idGeneratorStategy = strategy;
};

export const resetSequentialGenerator = () => {
  seq = 0;
};
