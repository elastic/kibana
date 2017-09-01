import sinon from 'sinon';
import expect from 'expect.js';
import { times } from 'lodash';

import { createEsTestCluster } from '../../../../../test_utils/es';
import { SavedObjectsClient } from '../../saved_objects_client';

const TYPE = 'dog';
const DOC_COUNT = 200;
const MAPPINGS = {
  rootType: {
    properties: {
      type: {
        type: 'keyword'
      },
      updated_at: {
        type: 'date'
      },
      [TYPE]: {
        properties: {
          name: {
            type: 'text'
          },
          order: {
            type: 'integer'
          }
        }
      }
    }
  }
};

describe('SavedObjectsClient integration: scrolling', function () {
  const es = createEsTestCluster({
    name: 'SavedObjectsClient/scrolling'
  });
  const callCluster = sinon.spy(es.getCallCluster());
  const savedObjectsClient = new SavedObjectsClient('.kibana', MAPPINGS, callCluster);

  this.timeout(es.getStartTimeout());

  before(async () => {
    await es.start();
    await callCluster('indices.delete', { index: '.kibana', ignore: 404 });
    await savedObjectsClient.bulkCreate(times(DOC_COUNT, i => ({
      type: TYPE,
      attributes: {
        order: i,
        name: `dog #${i + 1}`
      }
    })));
    callCluster.reset();
  });

  after(() => es.stop());

  it('returns expected responses', async () => {
    const names = await savedObjectsClient
      .createFindPage$({
        type: TYPE,
        perPage: 20,
        sortField: '_doc',
      })
      .mergeMap((resp, i) => {
        expect(resp).to.have.property('page', i + 1);
        expect(resp).to.have.property('per_page', 20);
        expect(resp).to.have.property('total', DOC_COUNT);
        expect(resp).to.have.property('saved_objects').an('array');
        return resp.saved_objects;
      })
      .map((savedObject) => {
        expect(savedObject).to.have.property('id').a('string');
        expect(savedObject).to.have.property('type', TYPE);
        expect(savedObject).to.have.property('attributes').an('object');
        expect(savedObject.attributes).to.have.property('order').a('number');
        expect(savedObject.attributes).to.have.property('name').match(/^dog #\d+$/);
        return savedObject.attributes.name;
      })
      .toArray()
      .toPromise();

    expect(names).to.be.an('array');
    expect(names).to.have.length(DOC_COUNT);
  });
});
