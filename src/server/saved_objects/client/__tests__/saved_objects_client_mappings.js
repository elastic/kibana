import elasticsearch from 'elasticsearch';
import expect from 'expect.js';
import sinon from 'sinon';

import { SavedObjectsClient } from '../saved_objects_client';
import { decorateEsError } from '../lib';
const { BadRequest } = elasticsearch.errors;

describe('SavedObjectsClient', () => {
  let callAdminCluster;
  let savedObjectsClient;
  const illegalArgumentException = { type: 'type_missing_exception' };

  describe('mapping', () => {
    beforeEach(() => {
      callAdminCluster = sinon.stub();
      savedObjectsClient = new SavedObjectsClient('.kibana-test', {}, callAdminCluster);
    });

    afterEach(() => {
      callAdminCluster.reset();
    });


    describe('#create', () => {
      it('falls back to single-type mapping', async () => {
        const error = decorateEsError(new BadRequest('[illegal_argument_exception] Rejecting mapping update to [.kibana-v6]', {
          body: {
            error: illegalArgumentException
          }
        }));

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

      it('prepends id for single-type', async () => {
        const id = 'foo';
        const error = decorateEsError(new BadRequest('[illegal_argument_exception] Rejecting mapping update to [.kibana-v6]', {
          body: {
            error: illegalArgumentException
          }
        }));

        callAdminCluster
          .onFirstCall().throws(error)
          .onSecondCall().returns(Promise.resolve());

        await savedObjectsClient.create('index-pattern', {}, { id });

        const [, args] = callAdminCluster.getCall(1).args;
        expect(args.id).to.eql('index-pattern:foo');
      });
    });

    describe('#bulkCreate', () => {
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

      it('falls back to single-type mappings', async () => {
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

      it('prepends id for single-type', async () => {
        callAdminCluster
          .onFirstCall().returns(Promise.resolve(firstResponse))
          .onSecondCall().returns(Promise.resolve(secondResponse));

        await savedObjectsClient.bulkCreate([
          { type: 'config', id: 'one', attributes: { title: 'Test One' } },
          { type: 'index-pattern', id: 'two', attributes: { title: 'Test Two' } }
        ]);

        const [, { body }] = callAdminCluster.getCall(1).args;
        expect(body[0].create._id).to.eql('config:one');
        expect(body[2].create._id).to.eql('index-pattern:two');
        // expect(args.id).to.eql('index-pattern:foo');
      });
    });

    describe('update', () => {
      const id = 'logstash-*';
      const type = 'index-pattern';
      const version = 2;
      const attributes = { title: 'Testing' };
      const error = decorateEsError(new BadRequest('[document_missing_exception] [config][logstash-*]: document missing', {
        body: {
          error: {
            type: 'document_missing_exception'
          }
        }
      }));

      beforeEach(() => {
        callAdminCluster
          .onFirstCall().throws(error)
          .onSecondCall().returns(Promise.resolve({
            _id: id,
            _type: type,
            _version: version,
            result: 'updated'
          }));
      });


      it('falls back to single-type mappings', async () => {
        const response = await savedObjectsClient.update('index-pattern', 'logstash-*', attributes);
        expect(response).to.eql({
          id,
          type,
          version,
          attributes
        });
      });

      it('prepends id for single-type', async () => {
        await savedObjectsClient.update('index-pattern', 'logstash-*', attributes);

        const [, args] = callAdminCluster.getCall(1).args;
        expect(args.id).to.eql('index-pattern:logstash-*');
      });
    });
  });
});
