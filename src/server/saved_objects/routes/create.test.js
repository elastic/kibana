import sinon from 'sinon';
import { createCreateRoute } from './create';
import { MockServer } from './_mock_server';

describe('POST /api/saved_objects/{type}', () => {
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
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing'
        }
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

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('requires attributes', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {}
    };

    const { statusCode, payload } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(response.validation.keys).toContain('attributes');
    expect(response.message).toMatch(/is required/);
    expect(response.statusCode).toBe(400);
    expect(statusCode).toBe(400);
  });

  it('calls upon savedObjectClient.create', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.create.calledOnce).toBe(true);

    const args = savedObjectsClient.create.getCall(0).args;
    const options = { overwrite: false, id: undefined };
    const attributes = { title: 'Testing' };

    expect(args).toEqual(['index-pattern', attributes, options]);
  });

  it('can specify an id', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.create.calledOnce).toBe(true);

    const args = savedObjectsClient.create.getCall(0).args;
    const options = { overwrite: false, id: 'logstash-*' };
    const attributes = { title: 'Testing' };

    expect(args).toEqual(['index-pattern', attributes, options]);
  });
});
