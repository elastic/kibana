import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';

import { SavedObjectsClient } from '../saved_objects_client';
const { BadRequest } = elasticsearch.errors;

describe('SavedObjectsClient', () => {
  let callAdminCluster;
  let savedObjectsClient;
  const illegalArgumentException = {
    type: 'illegal_argument_exception',
    reason: 'Rejecting mapping update to [.kibana-v6] as the final mapping would have more than 1 type: [doc, foo]'
  };

  describe('mapping', () => {
    beforeEach(() => {
      callAdminCluster = sinon.stub();
      savedObjectsClient = new SavedObjectsClient('.kibana-test', {}, callAdminCluster);
    });

    afterEach(() => {
      callAdminCluster.reset();
    });


    describe('#create', () => {
      it('falls back to v6 mapping', async () => {
        const error = new BadRequest('[illegal_argument_exception] Rejecting mapping update to [.kibana-v6]', {
          body: {
            error: illegalArgumentException
          }
        });

        callAdminCluster
          .onFirstCall().throws(error)
          .onSecondCall().returns(Promise.resolve({ _type: 'index-pattern', _id: 'logstash-*', _version: 2 }));

        const response = await savedObjectsClient.create('index-pattern', {
          title: 'Logstash'
        });

        expect(response).to.eql({
          type: 'index-pattern',
          id: 'logstash-*',
          version: 2,
          attributes: {
            title: 'Logstash',
          }
        });
      });
    });

    describe('#bulkCreate', () => {
      it('falls back to v6 mappings', async () => {
        const firstResponse = {
          errors: true,
          items: [{
            create: {
              _type: 'config',
              _id: 'one',
              _version: 2,
              status: 400,
              error: illegalArgumentException
            }
          }, {
            create: {
              _type: 'index-pattern',
              _id: 'two',
              _version: 2,
              status: 400,
              error: illegalArgumentException
            }
          }]
        };

        const secondResponse = {
          errors: false,
          items: [{
            create: {
              _type: 'config',
              _id: 'one',
              _version: 2
            }
          }, {
            create: {
              _type: 'index-pattern',
              _id: 'two',
              _version: 2
            }
          }]
        };

        callAdminCluster
          .onFirstCall().returns(Promise.resolve(firstResponse))
          .onSecondCall().returns(Promise.resolve(secondResponse));

        const response = await savedObjectsClient.bulkCreate([
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
        ]);

        expect(response).to.eql([
          {
            id: 'one',
            type: 'config',
            version: 2,
            attributes: { title: 'Test One' },
            error: undefined
          }, {
            id: 'two',
            type: 'index-pattern',
            version: 2,
            attributes: { title: 'Test Two' },
            error: undefined
          }
        ]);
      });
    });

    describe('update', () => {
      it('falls back to v6 mappings', async () => {
        const id = 'logstash-*';
        const type = 'index-pattern';
        const version = 2;
        const attributes = { title: 'Testing' };

        const error = new BadRequest('[document_missing_exception] [config][logstash-*]: document missing', {
          body: {
            error: {
              type: 'document_missing_exception'
            }
          }
        });

        callAdminCluster
          .onFirstCall().throws(error)
          .onSecondCall().returns(Promise.resolve({
            _id: id,
            _type: type,
            _version: version,
            result: 'updated'
          }));

        const response = await savedObjectsClient.update('index-pattern', 'logstash-*', attributes);
        expect(response).to.eql({
          id,
          type,
          version,
          attributes
        });
      });
    });
  });
});
