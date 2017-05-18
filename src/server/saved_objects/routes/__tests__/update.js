import expect from 'expect.js';
import sinon from 'sinon';
import { createUpdateRoute } from '../update';
import { MockServer } from './mock_server';

describe('PUT /api/saved_objects/{type}/{id?}', () => {
  const savedObjectsClient = { update: sinon.stub() };
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

    server.route(createUpdateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.update.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    savedObjectsClient.update.returns(Promise.resolve(true));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).to.be(200);
    expect(response).to.eql(true);
  });

  it('calls upon savedObjectClient.update', async () => {
    const attributes = { title: 'Testing' };
    const options = { version: 2 };
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes,
        version: options.version
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.update.calledOnce).to.be(true);

    const args = savedObjectsClient.update.getCall(0).args;
    expect(args).to.eql(['index-pattern', 'logstash-*', attributes, options]);
  });
});
