import expect from 'expect.js';
import sinon from 'sinon';
import Hapi from 'hapi';
import { set } from 'lodash';
import { analyzeRoute } from '../analyzeui';
import { errors as esErrors } from 'elasticsearch';


describe('plugins/analyzeui', () => {
  describe('/server/routes/analyzeui', () => {
    function setup(options = {}) {
      const {
        returns
      } = options;

      const callWithRequestStub = { callWithRequest: sinon.stub() };
      const server = new Hapi.Server();
      server.connection({ port: 8080 });
      set(server, 'plugins.elasticsearch.getCluster',
        sinon.stub().withArgs('data').returns(callWithRequestStub)
      );

      if(!returns) {
        callWithRequestStub.callWithRequest.returns(
          Promise.resolve({ detail: {}, tokens: {} }));
      } else {
        returns(callWithRequestStub);
      }

      analyzeRoute(server);

      return {
        server,
        callWithRequestStub
      };
    }

    describe('#/api/analyzeui/analyze', () => {
      it('indexName successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            indexName: 'indexName',
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        const indexName = callWithRequestStub.callWithRequest.getCall(0).args[2].index;
        expect(indexName).to.eql(request.payload.indexName);
      });

      it('analyzer successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            analyzer: 'analyzer',
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
            analyzer: request.payload.analyzer,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
      });

      it('tokenizer successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            tokenizer: 'tokenizer',
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
            tokenizer: request.payload.tokenizer,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
      });

      it('charfilters successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            charfilters: ['charfilter1', 'charfilter2'],
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
            char_filter: request.payload.charfilters,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
      });

      it('filters successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            filters: ['filter1', 'filter2'],
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
            filter: request.payload.filters,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
      });

      it('field successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            field: 'field',
            text: 'text'
          }
        };

        const response = {
          detail: {},
          request: {
            explain: true,
            text: request.payload.text,
            field: request.payload.field,
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
      });

      it('index not found exception', async () => {
        const error = new esErrors[404];
        error.body = {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index'
          }
        };
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            indexName: 'notfound',
            text: 'text'
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(404);
        expect(parsedPayload.message).to.eql(error.body.error.reason);
      });

      it('illegal argument exception', async () => {
        const error = new esErrors[400];
        error.body = {
          error: {
            type: 'illegal_argument_exception',
            reason: 'analyzer not found'
          }
        };
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            text: 'text',
            analyzer: 'no_analyzer'
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(400);
        expect(parsedPayload.message).to.eql(error.body.error.reason);
      });

      it('other exception', async () => {
        const error = new esErrors[500];
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/analyze',
          payload: {
            text: 'text',
            analyzer: 'no_analyzer'
          }
        };

        const { statusCode } = await server.inject(request);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(500);
      });

    });
    describe('#/api/analyzeui/multi_analyze', () => {

      it('no analyzers', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            text: 'text'
          }
        };

        const response = {
          resultAnalyzers: []
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(false);
      });

      it('empty analyzers', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            text: 'text',
            analyzers: []
          }
        };

        const response = {
          resultAnalyzers: []
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);
        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(false);
      });

      it('indexName successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            indexName: 'indexName',
            text: 'text',
            analyzers: [{ item: 'simple', id: 0 }]
          }
        };

        const response = {
          resultAnalyzers: [
            {
              analyzer: 'simple',
              id: 0,
              tokens: []
            }
          ]
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        const indexName = callWithRequestStub.callWithRequest.getCall(0).args[2].index;
        expect(indexName).to.eql(request.payload.indexName);
        const explain = callWithRequestStub.callWithRequest.getCall(0).args[2].body.explain;
        expect(explain).to.eql(false);
      });

      it('two analyzers successful response', async () => {
        const { server, callWithRequestStub } = setup();
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            text: 'text',
            analyzers: [{ item: 'simple', id: 0 }, { item: 'standard', id: 1 }]
          }
        };

        const response = {
          resultAnalyzers: [
            {
              analyzer: 'simple',
              id: 0,
              tokens: []
            },
            {
              analyzer: 'standard',
              id: 1,
              tokens: []
            }
          ]
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(statusCode).to.be(200);
        expect(parsedPayload).to.eql(response);

        expect(callWithRequestStub.callWithRequest.calledTwice).to.be(true);
        const explain = callWithRequestStub.callWithRequest.getCall(0).args[2].body.explain;
        expect(explain).to.eql(false);
      });

      it('index not found exception', async () => {
        const error = new esErrors[404];
        error.body = {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index'
          }
        };
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            indexName: 'not found',
            text: 'text',
            analyzers: [{ item: 'simple', id: 0 }]
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(404);
        expect(parsedPayload.message).to.eql(error.body.error.reason);
      });

      it('illegal argument exception', async () => {
        const error = new esErrors[400];
        error.body = {
          error: {
            type: 'illegal_argument_exception',
            reason: 'analyzer not found'
          }
        };
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            text: 'text',
            analyzers: [{ item: 'no_analyzer', id: 0 }],
          }
        };

        const { payload, statusCode } = await server.inject(request);
        const parsedPayload = JSON.parse(payload);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(400);
        expect(parsedPayload.message).to.eql(error.body.error.reason);
      });

      it('other exception', async () => {
        const error = new esErrors[500];
        const setThrows = (callWithRequestStub) => {
          callWithRequestStub.callWithRequest.returns(
            Promise.reject(error)
          );
        };
        const { server, callWithRequestStub } = setup(
          { returns: setThrows });
        const request = {
          method: 'POST',
          url: '/api/analyzeui/multi_analyze',
          payload: {
            text: 'text',
            analyzers: [{ item: 'no_analyzer', id: 0 }],
          }
        };

        const { statusCode } = await server.inject(request);

        expect(callWithRequestStub.callWithRequest.calledOnce).to.be(true);
        expect(statusCode).to.be(500);
      });

    });
  });
});
