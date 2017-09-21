import expect from 'expect.js';
import sinon from 'sinon';
import { times, cloneDeep, pick, partition } from 'lodash';
import Chance from 'chance';

import { patchIndex } from '../patch_index';
import { Mappings } from '../mappings';
import { getRootProperties, getRootType } from '../lib';

const chance = new Chance();

function createRandomMappingDsl(n = chance.integer({ min: 10, max: 20 })) {
  return {
    [chance.word()]: {
      properties: times(n, () => chance.word())
        .reduce((acc, prop) => ({
          ...acc,
          [prop]: {
            type: chance.pickone(['keyword', 'text', 'integer', 'boolean'])
          }
        }), {})
    }
  };
}

function splitMappingDsl(mappingsDsl) {
  const type = getRootType(mappingsDsl);
  const allProps = getRootProperties(mappingsDsl);
  const keyGroups = partition(Object.keys(allProps), (p, i) => i % 2);
  return keyGroups.map(keys => ({
    [type]: {
      ...mappingsDsl[type],
      properties: pick(allProps, keys)
    }
  }));
}

function createIndexDsl(name, mappingsDsl = {}) {
  return {
    [name]: {
      mappings: mappingsDsl
    }
  };
}

function createCallCluster(indexDsl) {
  return sinon.spy(async (method, params) => {
    switch (method) {
      case 'indices.get':
        expect(params).to.have.property('index', Object.keys(indexDsl)[0]);
        return cloneDeep(indexDsl);
      case 'indices.putMapping':
        return { ok: true };
      default:
        throw new Error(`stub not expecting callCluster('${method}')`);
    }
  });
}

describe('savedobjects/health_check/patchIndex()', () => {
  describe('general', () => {
    it('reads the _mappings feature of the indexName', async () => {
      const index = chance.word();
      const mappingsDsl = createRandomMappingDsl();
      const callCluster = createCallCluster(createIndexDsl(index, mappingsDsl));
      await patchIndex({
        callCluster,
        index,
        mappings: new Mappings(mappingsDsl),
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.get', sinon.match({
        feature: '_mappings'
      }));
    });
  });

  describe('multi-type index', () => {
    it('rejects', async () => {
      try {
        const mappingsDsl = createRandomMappingDsl();
        const index = chance.word();
        const callCluster = createCallCluster(createIndexDsl(index, {
          ...mappingsDsl,
          ...createRandomMappingDsl(),
          ...createRandomMappingDsl(),
          ...createRandomMappingDsl(),
        }));

        await patchIndex({
          index,
          callCluster,
          mappings: new Mappings(mappingsDsl),
          log: sinon.stub()
        });
        throw new Error('expected patchIndex() to throw an error');
      } catch (error) {
        expect(error)
          .to.have.property('message')
            .contain('Your Kibana index is out of date');
      }
    });
  });

  describe('v6 index', () => {
    it('does nothing if mappings match elasticsearch', async () => {
      const mappingsDsl = createRandomMappingDsl();
      const index = chance.word();
      const callCluster = createCallCluster(createIndexDsl(index, mappingsDsl));
      await patchIndex({
        index,
        callCluster,
        mappings: new Mappings(mappingsDsl),
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.get', sinon.match({ index }));
    });

    it('adds properties that are not in index', async () => {
      const [currentMappingsDsl, missingMappingsDsl] = splitMappingDsl(createRandomMappingDsl());
      const mappingsDsl = {
        ...currentMappingsDsl,
        ...missingMappingsDsl,
      };

      const index = chance.word();
      const callCluster = createCallCluster(createIndexDsl(index, currentMappingsDsl));
      await patchIndex({
        index,
        callCluster,
        mappings: new Mappings(mappingsDsl),
        log: sinon.stub()
      });

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.get', sinon.match({
        index
      }));
      sinon.assert.calledWithExactly(callCluster, 'indices.putMapping', sinon.match({
        index: index,
        type: getRootType(mappingsDsl),
        body: {
          properties: getRootProperties(mappingsDsl)
        }
      }));
    });

    it('ignores extra properties in index', async () => {
      const [currentMappingsDsl, extraMappingsDsl] = splitMappingDsl(createRandomMappingDsl());
      const index = chance.word();
      const callCluster = createCallCluster(createIndexDsl(index, currentMappingsDsl));
      await patchIndex({
        index,
        callCluster,
        mappings: new Mappings(extraMappingsDsl),
        log: sinon.stub()
      });

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.get', sinon.match({
        index
      }));
      sinon.assert.calledWithExactly(callCluster, 'indices.putMapping', sinon.match({
        index: index,
        type: getRootType(extraMappingsDsl),
        body: {
          properties: getRootProperties(extraMappingsDsl)
        }
      }));
    });
  });
});
