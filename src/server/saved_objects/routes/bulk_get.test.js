import sinon from 'sinon';
import { createBulkGetRoute } from './bulk_get';
import { MockServer } from './_mock_server';

describe('POST /api/saved_objects/_bulk_get', () => {
  const savedObjectsClient = { bulkGet: sinon.stub() };
  let server;

  beforeEach(() => {
    server = new MockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method(request, reply) {
          reply(savedObjectsClient);
        }
      },
    };

    server.route(createBulkGetRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.bulkGet.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_get',
      payload: [{
        id: 'abc123',
        type: 'index-pattern'
      }]
    };

    const clientResponse = {
      saved_objects: [{
        id: 'abc123',
        type: 'index-pattern',
        title: 'logstash-*',
        version: 2
      }]
    };

    savedObjectsClient.bulkGet.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.bulkGet', async () => {
    const docs = [{
      id: 'abc123',
      type: 'index-pattern'
    }];

    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_get',
      payload: docs
    };

    await server.inject(request);
    expect(savedObjectsClient.bulkGet.calledOnce).toBe(true);

    const args = savedObjectsClient.bulkGet.getCall(0).args;
    expect(args[0]).toEqual(docs);
  });

});
