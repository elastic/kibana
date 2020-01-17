/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Chance from 'chance';
import expect from '@kbn/expect';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../legacy/utils';

import { createFilterRecordsStream } from '../filter_records_stream';

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
      createFilterRecordsStream('type'),
      createConcatStream([]),
    ]);

    expect(output).to.eql([]);
  });

  it('produces record values that have a matching type', async () => {
    const type1 = chance.word({ length: 5 });
    const output = await createPromiseFromStreams([
      createListStream([
        { type: type1, value: {} },
        { type: type1, value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: type1, value: {} },
        { type: chance.word({ length: 10 }), value: {} },
        { type: chance.word({ length: 10 }), value: {} },
      ]),
      createFilterRecordsStream(type1),
      createConcatStream([]),
    ]);

    expect(output).to.have.length(3);
    expect(output.map(o => o.type)).to.eql([type1, type1, type1]);
  });
});
