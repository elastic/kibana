import { getContentType } from '../../src/es';

const { test, module, equal } = window.QUnit;

const APPLICATION_NEWLINE_JSON = 'application/x-ndjson';
const APPLICATION_JSON = 'application/json';

module('Content type');

test('line delimited json without formatting', () => {
  const contentType = getContentType([
    JSON.stringify({
      foo: 'baz'
    }),
    JSON.stringify({
      foo: 'bar'
    })
  ].join('\n'))

  equal(contentType, APPLICATION_NEWLINE_JSON);
});

// not to spec, fallback to json
test('line delimited json with formatting', () => {
  const contentType = getContentType([
    JSON.stringify({
      foo: 'baz'
    }),
    JSON.stringify({
      foo: 'bar'
    }, null, 2)
  ].join('\n'))

  equal(contentType, APPLICATION_JSON);
});

test('one line of of json without formatting', () => {
  const contentType = getContentType([
    JSON.stringify({
      foo: 'baz'
    })
  ].join('\n'))

  equal(contentType, APPLICATION_JSON);
});

test('json over multiple lines', () => {
  const contentType = getContentType(JSON.stringify({
    foo: 'bar'
  }, null, 2));

  equal(contentType, APPLICATION_JSON);
});

test('no body', () => {
  const contentType = getContentType('');

  equal(contentType, undefined);
});
