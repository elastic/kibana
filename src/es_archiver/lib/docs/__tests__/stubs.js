import sinon from 'sinon';
import Chance from 'chance';
import { times } from 'lodash';
const chance = new Chance();

export const createStubStats = () => ({
  indexedDoc: sinon.stub(),
  archivedDoc: sinon.stub(),
});

export const createPersonDocRecords = n => times(n, () => ({
  type: 'doc',
  value: {
    index: 'people',
    type: 'person',
    id: chance.natural(),
    source: {
      name: chance.name(),
      birthday: chance.birthday(),
      ssn: chance.ssn(),
    }
  }
}));

export const createStubClient = (responses = []) => {
  const createStubClientMethod = name => sinon.spy(async (params) => {
    if (responses.length === 0) {
      throw new Error(`unexpected client.${name} call`);
    }

    const response = responses.shift();
    return await response(name, params);
  });

  return {
    search: createStubClientMethod('search'),
    scroll: createStubClientMethod('scroll'),
    bulk: createStubClientMethod('bulk'),

    assertNoPendingResponses() {
      if (responses.length) {
        throw new Error(`There are ${responses.length} unsent responses.`);
      }
    },
  };
};
