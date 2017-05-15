import expect from 'expect.js';
import sinon from 'sinon';
import { createCreateRoute } from '../create';
import { MockServer } from './mock_server';

describe('POST /api/kibana/saved_objects/{type}/{id?}', () => {
  const savedObjectsClient = { create: sinon.stub() };
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

    server.route(createCreateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.create.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/kibana/saved_objects/index-pattern',
      payload: {
        title: 'Testing'
      }
    };
    const clientResponse = {
      type: 'index-pattern',
      id: 'logstash-*',
      title: 'Testing'
    };

    savedObjectsClient.create.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).to.be(200);
    expect(response).to.eql(clientResponse);
  });

  it('calls upon savedObjectClient.create', async () => {
    const request = {
      method: 'POST',
      url: '/api/kibana/saved_objects/index-pattern/logstash-*',
      payload: {
        title: 'Testing'
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.create.calledOnce).to.be(true);

    const args = savedObjectsClient.create.getCall(0).args;
    expect(args).to.eql(['index-pattern', { title: 'Testing', id: 'logstash-*' }]);
  });
});
