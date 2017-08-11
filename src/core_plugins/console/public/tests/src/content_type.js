import { getContentType } from '../../src/es';

const { test, module, equal } = window.QUnit;

const APPLICATION_JSON = 'application/json';

module('Content type');

test('body', () => {
  const contentType = getContentType([
    JSON.stringify({
      foo: 'baz'
    }),
    JSON.stringify({
      foo: 'bar'
    })
  ].join('\n'))

  equal(contentType, APPLICATION_JSON);
});

test('no body', () => {
  const contentType = getContentType('');

  equal(contentType, undefined);
});
