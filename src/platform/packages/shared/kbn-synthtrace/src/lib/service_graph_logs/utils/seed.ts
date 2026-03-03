/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashStr } from '../placeholders';

export function resolveEffectiveSeed(
  seed: number | undefined,
  index: number,
  timestamp?: number
): number {
  if (seed != null) {
    return seed + index + (timestamp ?? 0);
  }
  return (timestamp ?? Date.now()) + index;
}

export function serviceStableSeed(baseSeed: number, serviceName: string): number {
  // eslint-disable-next-line no-bitwise
  return (baseSeed ^ hashStr(serviceName)) >>> 0;
}
