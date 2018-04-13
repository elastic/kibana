import sinon from 'sinon';
import { createFindRoute } from './find';
import { MockServer } from './_mock_server';

describe('GET /api/saved_objects/_find', () => {
  const savedObjectsClient = { find: sinon.stub() };
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

    server.route(createFindRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.find.reset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find'
    };

    const clientResponse = {
      total: 2,
      data: [
        {
          type: 'index-pattern',
          id: 'logstash-*',
          title: 'logstash-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }, {
          type: 'index-pattern',
          id: 'stocks-*',
          title: 'stocks-*',
          timeFieldName: '@timestamp',
          notExpandable: true
        }
      ]
    };

    savedObjectsClient.find.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.find with defaults', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({ perPage: 20, page: 1 });
  });

  it('accepts the query parameter page/per_page', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?per_page=10&page=50'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({ perPage: 10, page: 50 });
  });

  it('accepts the query parameter search_fields', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?search_fields=title'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({ perPage: 20, page: 1, searchFields: ['title'] });
  });

  it('accepts the query parameter fields as a string', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?fields=title'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({ perPage: 20, page: 1, fields: ['title'] });
  });

  it('accepts the query parameter fields as an array', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?fields=title&fields=description'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({
      perPage: 20, page: 1, fields: ['title', 'description']
    });
  });

  it('accepts the type as a query parameter', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=index-pattern'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).toBe(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).toEqual({ perPage: 20, page: 1, type: 'index-pattern' });
  });
});
