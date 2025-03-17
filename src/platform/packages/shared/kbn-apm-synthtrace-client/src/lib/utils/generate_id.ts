/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let seq = 0;

const LONG_ID_LENGTH = 32;
const SHORT_ID_LENGTH = 16;

function generateId(length: number = LONG_ID_LENGTH) {
  const seqId = String(seq++);
  const timestamp = Date.now();

  const randomHex = (timestamp * seq).toString(16).slice(0, length - seqId.length);
  const generatedId = (randomHex + seqId.padStart(length - randomHex.length, '0')).slice(0, length);

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
  return generateId(SHORT_ID_LENGTH);
}

export function generateLongId() {
  return generateId(LONG_ID_LENGTH);
}

export function generateLongIdWithSeed(seed: string) {
  return generateIdWithSeed(seed, LONG_ID_LENGTH);
}
