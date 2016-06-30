import expect from 'expect.js';
import callWithRequest from '../call_with_request';

describe('call_with_request', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      search(params) {
        this.params = params;
        return Promise.resolve(this);
      }
    };
  });

  it ('passes through all headers', () => {
    const mockRequest = {
      headers: {
        authorization: 'Basic QWxhZGRpbjpPcGVuU2VzYW1l',
        'kbn-version': '4.6.0'
      }
    };
    return callWithRequest(mockClient)(mockRequest, 'search')
    .then(() => {
      expect(mockClient.params.headers).to.be(mockRequest.headers);
    });
  });
});
