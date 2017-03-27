import Chance from 'chance';
import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../utils';

import {
  createFilterRecordsStream,
} from '../filter_records_stream';

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
        chance.bool()
      ]),
      createFilterRecordsStream('type'),
      createConcatStream([]),
    ]);

    expect(output).to.eql([]);
  });

  it('produces record values that have a matching type', async () => {
    const type1 = chance.word();
    const output = await createPromiseFromStreams([
      createListStream([
        { type: type1, value: {} },
        { type: type1, value: {} },
        { type: chance.word(), value: {} },
        { type: chance.word(), value: {} },
        { type: type1, value: {} },
        { type: chance.word(), value: {} },
        { type: chance.word(), value: {} },
      ]),
      createFilterRecordsStream(type1),
      createConcatStream([]),
    ]);

    expect(output).to.have.length(3);
    expect(output.map(o => o.type)).to.eql([
      type1,
      type1,
      type1,
    ]);
  });
});
