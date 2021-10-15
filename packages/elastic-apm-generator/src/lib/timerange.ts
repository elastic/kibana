/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Interval } from './interval';

export class Timerange {
  constructor(private from: number, private to: number) {}

  interval(interval: string) {
    return new Interval(this.from, this.to, interval);
  }
}

export function timerange(from: number, to: number) {
  return new Timerange(from, to);
}
