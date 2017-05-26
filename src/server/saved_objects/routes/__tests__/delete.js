import expect from 'expect.js';
import sinon from 'sinon';
import { createDeleteRoute } from '../delete';
import { MockServer } from './mock_server';

describe('DELETE /api/saved_objects/{type}/{id}', () => {
  const savedObjectsClient = { delete: sinon.stub() };
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

    server.route(createDeleteRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.delete.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'DELETE',
      url: '/api/saved_objects/index-pattern/logstash-*'
    };
    const clientResponse = true;

    savedObjectsClient.delete.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).to.be(200);
    expect(response).to.eql(clientResponse);
  });

  it('calls upon savedObjectClient.delete', async () => {
    const request = {
      method: 'DELETE',
      url: '/api/saved_objects/index-pattern/logstash-*'
    };

    await server.inject(request);
    expect(savedObjectsClient.delete.calledOnce).to.be(true);

    const args = savedObjectsClient.delete.getCall(0).args;
    expect(args).to.eql(['index-pattern', 'logstash-*']);
  });
});
