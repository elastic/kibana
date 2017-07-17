import expect from 'expect.js';
import sinon from 'sinon';
import { isEqual, times, cloneDeep, size, pick, partition } from 'lodash';
import Chance from 'chance';

import { patchKibanaIndex } from '../patch_kibana_index';
import { getRootProperties, getRootType } from '../../../../server/mappings';

const chance = new Chance();

function createRandomMappings(n = chance.integer({ min: 10, max: 20 })) {
  return {
    [chance.word()]: {
      properties: times(n, () => chance.word())
        .reduce((acc, prop) => ({
          ...acc,
          [prop]: {
            type: chance.pickone(['keyword', 'text', 'integer', 'boolean'])
          }
        }))
    }
  };
}

function splitMappings(mappings) {
  const type = getRootType(mappings);
  const allProps = getRootProperties(mappings);
  const keyGroups = partition(Object.keys(allProps), (p, i) => i % 2);
  return keyGroups.map(keys => ({
    [type]: {
      ...mappings[type],
      properties: pick(allProps, keys)
    }
  }));
}

function createIndex(name, mappings = {}) {
  return {
    [name]: {
      mappings
    }
  };
}

function createCallCluster(index) {
  return sinon.spy(async (method, params) => {
    switch (method) {
      case 'indices.get':
        expect(params).to.have.property('index', Object.keys(index)[0]);
        return cloneDeep(index);
      case 'indices.putMapping':
        return { ok: true };
      default:
        throw new Error(`stub not expecting callCluster('${method}')`);
    }
  });
}

// TODO: these tests fail
describe('es/healthCheck/patchKibanaIndex()', () => {
  describe('general', () => {
    it('reads the _mappings feature of the indexName', async () => {
      const indexName = chance.word();
      const mappings = createRandomMappings();
      const callCluster = createCallCluster(createIndex(indexName, mappings));
      await patchKibanaIndex({
        callCluster,
        indexName,
        mappings,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({
        feature: '_mappings'
      }));
    });
  });

  describe('multi-type index', () => {
    it('rejects', async () => {
      try {
        const mappings = createRandomMappings();
        const indexName = chance.word();
        const index = createIndex(indexName, {
          ...mappings,
          ...createRandomMappings(),
          ...createRandomMappings(),
          ...createRandomMappings(),
        });
        const callCluster = createCallCluster(index);

        await patchKibanaIndex({
          indexName,
          callCluster,
          mappings,
          log: sinon.stub()
        });
        throw new Error('expected patchKibanaIndex() to throw an error');
      } catch (error) {
        expect(error)
          .to.have.property('message')
            .contain('Support for Kibana index format v5 has been removed');
      }
    });
  });

  describe('v6 index', () => {
    it('does nothing if mappings match elasticsearch', async () => {
      const mappings = createRandomMappings();
      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, mappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        mappings,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
    });

    it('adds properties that are not in index', async () => {
      const [indexMappings, missingMappings] = splitMappings(createRandomMappings());

      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, indexMappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        mappings: [
          ...indexMappings,
          ...missingMappings,
        ],
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + size(missingMappings));
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      sinon.assert.calledWith(callCluster, 'indices.putMapping', sinon.match({
        index: indexName,
        type: 'doc',
        body: {
          properties: sinon.match(props => isEqual(
            Object.keys(missingMappings),
            Object.keys(props)
          ), 'sameKeys')
        }
      }));
    });

    it('ignores extra properties in index', async () => {
      const [indexMappings, missingMappings] = splitMappings(createRandomMappings());
      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, indexMappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        mappings: missingMappings,
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + size(missingMappings));
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      missingMappings.forEach(type => {
        sinon.assert.calledWith(callCluster, 'indices.putMapping', sinon.match({
          index: indexName,
          type: 'doc',
          body: {
            properties: {
              [type.name]: type.mapping,
            }
          }
        }));
      });
    });

    it('does not define the _default_ type', async () => {
      const indexMappings = {};
      const missingMappings = createRandomMappings();

      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, indexMappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        mappings: missingMappings,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
    });
  });
});
