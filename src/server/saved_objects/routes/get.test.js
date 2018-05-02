import sinon from 'sinon';
import { createGetRoute } from './get';
import { MockServer } from './_mock_server';

describe('GET /api/saved_objects/{type}/{id}', () => {
  const savedObjectsClient = { get: sinon.stub() };
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

    server.route(createGetRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.get.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/index-pattern/logstash-*'
    };
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      notExpandable: true
    };

    savedObjectsClient.get.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.get', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/index-pattern/logstash-*'
    };

    await server.inject(request);
    expect(savedObjectsClient.get.calledOnce).toBe(true);

    const args = savedObjectsClient.get.getCall(0).args;
    expect(args).toEqual(['index-pattern', 'logstash-*']);
  });

});
