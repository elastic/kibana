/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

class Timerange {
  constructor(private from: number, private to: number) {}

  // maybe name this something else? perMinute()/perSecond()/rate()
  every(interval: string, repeated = 1) {
    let now = this.from;
    const args = interval.match(/(.*)(s|m|h|d)/);
    if (!args) {
      throw new Error('Failed to parse interval');
    }
    const timestamps: number[] = [];
    while (now <= this.to) {
      timestamps.push(...new Array<number>(repeated).fill(now));
      now = moment(now)
        .add(Number(args[1]), args[2] as any)
        .valueOf();
    }
    return timestamps;
  }
}

export function timerange(from: number, to: number) {
  return new Timerange(from, to);
}
