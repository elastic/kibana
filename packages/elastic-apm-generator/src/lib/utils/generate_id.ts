/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuidv5 from 'uuid/v5';

let seq = 0;

const namespace = 'f38d5b83-8eee-4f5b-9aa6-2107e15a71e3';

function generateId() {
  return uuidv5(String(seq++), namespace).replace(/-/g, '');
}

export function generateEventId() {
  return generateId().substr(0, 16);
}

export function generateTraceId() {
  return generateId().substr(0, 32);
}
