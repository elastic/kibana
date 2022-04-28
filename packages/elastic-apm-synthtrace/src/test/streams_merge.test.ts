/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { timerange } from '../lib/timerange';
import { Serializable } from '../lib/serializable';
import { Fields } from '../lib/entity';

export type DocFields = Fields & Partial<{ type: string }>;

class Doc extends Serializable<DocFields> {
  constructor(type: string) {
    super({
      type,
    });
  }
}

describe('Merging streams', () => {
  let events: DocFields[];
  let types: string[];

  const range = timerange(
    new Date('2021-01-01T00:00:00.000Z'),
    new Date('2021-01-01T00:02:00.000Z')
  );

  beforeEach(() => {
    const iterable = range
      .interval('1m')
      .rate(1)
      .generator(() => new Doc('metric'))
      .merge(
        range
          .interval('1m')
          .rate(4)
          .generator(() => new Doc('transaction'))
      );

    events = iterable.toArray();
    types = events.map((e) => e.type!);
  });
  it('metrics yields before transaction event hough it has less weight', () => {
    expect(events[0].type).toBe('metric');
  });
  it('merging data streams uses rate per minute to ensure high volume streams are represented', () => {
    expect(types).toEqual([
      'metric',
      'transaction',
      'transaction',
      'transaction',
      'transaction',
      'metric',
      'transaction',
      'transaction',
      'transaction',
      'transaction',
    ]);
  });
});
