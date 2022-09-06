/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function intervalToMs(interval: unknown) {
  const [, valueAsString, unit] = String(interval).split(/(.*)(s|m|h|d|w)/);

  const value = Number(valueAsString);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 1000 * 60;

    case 'h':
      return value * 1000 * 60 * 60;

    case 'd':
      return value * 1000 * 60 * 60 * 24;

    case 'w':
      return value * 1000 * 60 * 60 * 24 * 7;
  }

  throw new Error('Could not parse interval');
}
