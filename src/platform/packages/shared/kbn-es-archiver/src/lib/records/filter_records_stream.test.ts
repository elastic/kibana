/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Chance from 'chance';

import { createListStream, createPromiseFromStreams, createConcatStream } from '@kbn/utils';

import { createFilterRecordsStream } from './filter_records_stream';

const chance = new Chance();

describe('esArchiver: createFilterRecordsStream()', () => {
  it('consumes any value', async () => {
    const output = await createPromiseFromStreams([
      createListStream([
        chance.integer(),
        /test/,
        {
          birthday: chance.birthday(),
          ssn: chance.ssn(),
        },
        chance.bool(),
      ]),
      createFilterRecordsStream((record) => record.type === 'type'),
      createConcatStream([]),
    ]);

    expect(output).toEqual([]);
  });

  it('produces record values that have a matching type', async () => {
    const type1 = chance.word({ length: 5 });
    const output = await createPromiseFromStreams<any[]>([
      createListStream([
        { type: type1, value: {} },
        { type: type1, value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: type1, value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: chance.word({ length: 10 }), value: {} },
      ]),
      createFilterRecordsStream((record) => record.type === type1),
      createConcatStream([]),
    ]);

    expect(output).toHaveLength(3);
    expect(output.map((o) => o.type)).toEqual([type1, type1, type1]);
  });
});
