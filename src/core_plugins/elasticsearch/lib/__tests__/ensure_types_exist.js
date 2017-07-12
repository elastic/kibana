import expect from 'expect.js';
import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import Chance from 'chance';

import { ensureTypesExist } from '../ensure_types_exist';

const chance = new Chance();

function createRandomTypes(n = chance.integer({ min: 10, max: 20 })) {
  return chance.n(
    () => ({
      name: chance.word(),
      mapping: {
        type: chance.pickone(['keyword', 'text', 'integer', 'boolean'])
      }
    }),
    n
  );
}

function typesToMapping(types) {
  return types.reduce((acc, type) => ({
    ...acc,
    [type.name]: type.mapping
  }), {});
}

function createV5Index(name, types) {
  return {
    [name]: {
      mappings: typesToMapping(types)
    }
  };
}

function createV6Index(name, types) {
  return {
    [name]: {
      mappings: {
        doc: {
          properties: typesToMapping(types)
        }
      }
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

describe('es/healthCheck/ensureTypesExist()', () => {
  describe('general', () => {
    it('reads the _mappings feature of the indexName', async () => {
      const indexName = chance.word();
      const callCluster = createCallCluster(createV5Index(indexName, []));
      await ensureTypesExist({
        callCluster,
        indexName,
        types: [],
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({
        feature: '_mappings'
      }));
    });
  });

  describe('v5 index', () => {
    it('does nothing if mappings match elasticsearch', async () => {
      const types = createRandomTypes();
      const indexName = chance.word();
      const callCluster = createCallCluster(createV5Index(indexName, types));
      await ensureTypesExist({
        indexName,
        callCluster,
        types,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
    });

    it('adds types that are not in index', async () => {
      const indexTypes = createRandomTypes();
      const missingTypes = indexTypes.splice(-5);

      const indexName = chance.word();
      const callCluster = createCallCluster(createV5Index(indexName, indexTypes));
      await ensureTypesExist({
        indexName,
        callCluster,
        types: [
          ...indexTypes,
          ...missingTypes,
        ],
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + missingTypes.length);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      missingTypes.forEach(type => {
        sinon.assert.calledWith(callCluster, 'indices.putMapping', sinon.match({
          index: indexName,
          type: type.name,
          body: type.mapping
        }));
      });
    });

    it('ignores extra types in index', async () => {
      const indexTypes = createRandomTypes();
      const missingTypes = indexTypes.splice(-5);

      const indexName = chance.word();
      const callCluster = createCallCluster(createV5Index(indexName, indexTypes));
      await ensureTypesExist({
        indexName,
        callCluster,
        types: missingTypes,
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + missingTypes.length);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      missingTypes.forEach(type => {
        sinon.assert.calledWith(callCluster, 'indices.putMapping', sinon.match({
          index: indexName,
          type: type.name,
          body: type.mapping
        }));
      });
    });
  });

  describe('v6 index', () => {
    it('does nothing if mappings match elasticsearch', async () => {
      const types = createRandomTypes();
      const indexName = chance.word();
      const callCluster = createCallCluster(createV6Index(indexName, types));
      await ensureTypesExist({
        indexName,
        callCluster,
        types,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
    });

    it('adds types that are not in index', async () => {
      const indexTypes = createRandomTypes();
      const missingTypes = indexTypes.splice(-5);

      const indexName = chance.word();
      const callCluster = createCallCluster(createV6Index(indexName, indexTypes));
      await ensureTypesExist({
        indexName,
        callCluster,
        types: [
          ...indexTypes,
          ...missingTypes,
        ],
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + missingTypes.length);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      missingTypes.forEach(type => {
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

    it('ignores extra types in index', async () => {
      const indexTypes = createRandomTypes();
      const missingTypes = indexTypes.splice(-5);

      const indexName = chance.word();
      const callCluster = createCallCluster(createV6Index(indexName, indexTypes));
      await ensureTypesExist({
        indexName,
        callCluster,
        types: missingTypes,
        log: sinon.stub()
      });

      sinon.assert.callCount(callCluster, 1 + missingTypes.length);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
      missingTypes.forEach(type => {
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
      const indexTypes = [];
      const missingTypes = [
        {
          name: '_default_',
          mapping: {}
        }
      ];

      const indexName = chance.word();
      const callCluster = createCallCluster(createV6Index(indexName, indexTypes));
      await ensureTypesExist({
        indexName,
        callCluster,
        types: missingTypes,
        log: sinon.stub()
      });

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'indices.get', sinon.match({ index: indexName }));
    });
  });
});
