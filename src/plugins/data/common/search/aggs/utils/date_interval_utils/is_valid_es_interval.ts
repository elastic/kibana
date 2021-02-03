/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parseEsInterval } from './parse_es_interval';

/**
 * Checks whether a given interval string (e.g. 1w, 24h, ...) is a valid Elasticsearch interval.
 * Will return false if the interval is not valid in Elasticsearch, otherwise true.
 * Invalid intervals might be: 2f, since there is no unit 'f'; 2w, since weeks and month intervals
 * are only allowed with a value of 1, etc.
 *
 * @param interval The interval string like 1w, 24h
 * @returns True if the interval is valid for Elasticsearch
 */
export function isValidEsInterval(interval: string): boolean {
  try {
    parseEsInterval(interval);
    return true;
  } catch {
    return false;
  }
}
