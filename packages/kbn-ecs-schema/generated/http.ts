export const httpEcs = {
  request: {
    body: { bytes: [Object], content: [Object] },
    bytes: {
      dashed_name: 'http-request-bytes',
      description: 'Total size in bytes of the request (body and headers).',
      example: 1437,
      flat_name: 'http.request.bytes',
      format: 'bytes',
      level: 'extended',
      name: 'request.bytes',
      normalize: [],
      short: 'Total size in bytes of the request (body and headers).',
      type: 'long'
    },
    id: {
      dashed_name: 'http-request-id',
      description: 'A unique identifier for each HTTP request to correlate logs between clients and servers in transactions.\n' +
        'The id may be contained in a non-standard HTTP header, such as `X-Request-ID` or `X-Correlation-ID`.',
      example: '123e4567-e89b-12d3-a456-426614174000',
      flat_name: 'http.request.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'request.id',
      normalize: [],
      short: 'HTTP request ID.',
      type: 'keyword'
    },
    method: {
      dashed_name: 'http-request-method',
      description: 'HTTP request method.\n' +
        'The value should retain its casing from the original event. For example, `GET`, `get`, and `GeT` are all considered valid values for this field.',
      example: 'POST',
      flat_name: 'http.request.method',
      ignore_above: 1024,
      level: 'extended',
      name: 'request.method',
      normalize: [],
      short: 'HTTP request method.',
      type: 'keyword'
    },
    mime_type: {
      dashed_name: 'http-request-mime-type',
      description: 'Mime type of the body of the request.\n' +
        "This value must only be populated based on the content of the request body, not on the `Content-Type` header. Comparing the mime type of a request with the request's Content-Type header can be helpful in detecting threats or misconfigured clients.",
      example: 'image/gif',
      flat_name: 'http.request.mime_type',
      ignore_above: 1024,
      level: 'extended',
      name: 'request.mime_type',
      normalize: [],
      short: 'Mime type of the body of the request.',
      type: 'keyword'
    },
    referrer: {
      dashed_name: 'http-request-referrer',
      description: 'Referrer for this HTTP request.',
      example: 'https://blog.example.com/',
      flat_name: 'http.request.referrer',
      ignore_above: 1024,
      level: 'extended',
      name: 'request.referrer',
      normalize: [],
      short: 'Referrer for this HTTP request.',
      type: 'keyword'
    }
  },
  response: {
    body: { bytes: [Object], content: [Object] },
    bytes: {
      dashed_name: 'http-response-bytes',
      description: 'Total size in bytes of the response (body and headers).',
      example: 1437,
      flat_name: 'http.response.bytes',
      format: 'bytes',
      level: 'extended',
      name: 'response.bytes',
      normalize: [],
      short: 'Total size in bytes of the response (body and headers).',
      type: 'long'
    },
    mime_type: {
      dashed_name: 'http-response-mime-type',
      description: 'Mime type of the body of the response.\n' +
        "This value must only be populated based on the content of the response body, not on the `Content-Type` header. Comparing the mime type of a response with the response's Content-Type header can be helpful in detecting misconfigured servers.",
      example: 'image/gif',
      flat_name: 'http.response.mime_type',
      ignore_above: 1024,
      level: 'extended',
      name: 'response.mime_type',
      normalize: [],
      short: 'Mime type of the body of the response.',
      type: 'keyword'
    },
    status_code: {
      dashed_name: 'http-response-status-code',
      description: 'HTTP response status code.',
      example: 404,
      flat_name: 'http.response.status_code',
      format: 'string',
      level: 'extended',
      name: 'response.status_code',
      normalize: [],
      short: 'HTTP response status code.',
      type: 'long'
    }
  },
  version: {
    dashed_name: 'http-version',
    description: 'HTTP version.',
    example: 1.1,
    flat_name: 'http.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'HTTP version.',
    type: 'keyword'
  }
}