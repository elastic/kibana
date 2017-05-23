import expect from 'expect.js';
import sinon from 'sinon';
import { createFindRoute } from '../find';
import { MockServer } from './mock_server';

describe('GET /api/saved_objects/{type?}', () => {
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
      url: '/api/saved_objects'
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

    expect(statusCode).to.be(200);
    expect(response).to.eql(clientResponse);
  });

  it('calls upon savedObjectClient.find with defaults', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 20, page: 1 });
  });

  it('accepts the query parameter page/per_page', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects?per_page=10&page=50'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 10, page: 50 });
  });

  it('accepts the query parameter search_fields', async() => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects?search_fields=title'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 20, page: 1, searchFields: 'title' });
  });

  it('accepts the query parameter fields as a string', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects?fields=title'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 20, page: 1, fields: 'title' });
  });

  it('accepts the query parameter fields as an array', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects?fields=title&fields=description'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({
      perPage: 20, page: 1, fields: ['title', 'description']
    });
  });

  it('accepts the type as a query parameter', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects?type=index-pattern'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 20, page: 1, type: 'index-pattern' });
  });

  it('accepts the type as a URL parameter', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/index-pattern'
    };

    await server.inject(request);

    expect(savedObjectsClient.find.calledOnce).to.be(true);

    const options = savedObjectsClient.find.getCall(0).args[0];
    expect(options).to.eql({ perPage: 20, page: 1, type: 'index-pattern' });
  });
});
