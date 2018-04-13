import sinon from 'sinon';
import { createUpdateRoute } from './update';
import { MockServer } from './_mock_server';

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

    expect(statusCode).toBe(200);
    expect(response).toEqual(true);
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
    expect(savedObjectsClient.update.calledOnce).toBe(true);

    const args = savedObjectsClient.update.getCall(0).args;
    expect(args).toEqual(['index-pattern', 'logstash-*', attributes, options]);
  });
});
