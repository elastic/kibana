import expect from 'expect.js';
import sinon from 'sinon';
import { times, cloneDeep, pick, partition } from 'lodash';
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
        }), {})
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
      case 'indices.getMapping':
        if (!index) {
          return { status: 404 };
        } else {
          expect(params).to.have.property('index', Object.keys(index)[0]);
          return cloneDeep(index);
        }

      case 'indices.putMapping':
        return { ok: true };

      default:
        throw new Error(`stub not expecting callCluster('${method}')`);
    }
  });
}

describe('es/healthCheck/patchKibanaIndex()', () => {
  describe('general', () => {
    it('reads the mapping for the indexName', async () => {
      const indexName = chance.word();
      const mappings = createRandomMappings();
      const callCluster = createCallCluster(createIndex(indexName, mappings));
      await patchKibanaIndex({
        callCluster,
        indexName,
        kibanaIndexMappingsDsl: mappings,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.getMapping', sinon.match({
        ignore: [404],
        index: indexName,
      }));
    });
  });

  describe('missing index', () => {
    it('returns without doing anything', async () => {
      const indexName = chance.word();
      const mappings = createRandomMappings();
      const callCluster = createCallCluster(null);
      const log = sinon.stub();
      await patchKibanaIndex({
        callCluster,
        indexName,
        kibanaIndexMappingsDsl: mappings,
        log
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.notCalled(log);
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
          kibanaIndexMappingsDsl: mappings,
          log: sinon.stub()
        });
        throw new Error('expected patchKibanaIndex() to throw an error');
      } catch (error) {
        expect(error)
          .to.have.property('message')
          .contain('Your Kibana index is out of date');
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
        kibanaIndexMappingsDsl: mappings,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.getMapping', sinon.match({ index: indexName }));
    });

    it('adds properties that are not in index', async () => {
      const [indexMappings, missingMappings] = splitMappings(createRandomMappings());
      const mappings = {
        ...indexMappings,
        ...missingMappings,
      };

      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, indexMappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        kibanaIndexMappingsDsl: mappings,
        log: sinon.stub()
      });

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.getMapping', sinon.match({ index: indexName }));
      sinon.assert.calledWithExactly(callCluster, 'indices.putMapping', sinon.match({
        index: indexName,
        type: getRootType(mappings),
        body: {
          properties: getRootProperties(mappings)
        }
      }));
    });

    it('ignores extra properties in index', async () => {
      const [indexMappings, mappings] = splitMappings(createRandomMappings());
      const indexName = chance.word();
      const callCluster = createCallCluster(createIndex(indexName, indexMappings));
      await patchKibanaIndex({
        indexName,
        callCluster,
        kibanaIndexMappingsDsl: mappings,
        log: sinon.stub()
      });

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithExactly(callCluster, 'indices.getMapping', sinon.match({
        index: indexName
      }));
      sinon.assert.calledWithExactly(callCluster, 'indices.putMapping', sinon.match({
        index: indexName,
        type: getRootType(mappings),
        body: {
          properties: getRootProperties(mappings)
        }
      }));
    });
  });
});
