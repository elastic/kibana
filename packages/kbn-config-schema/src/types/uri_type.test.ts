/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '..';

test('is required by default', () => {
  expect(() => schema.uri().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [undefined]."`
  );
});

test('returns value for valid URI as per RFC3986', () => {
  const uriSchema = schema.uri();

  expect(uriSchema.validate('http://tools.ietf.org/html/rfc3986')).toBe(
    'http://tools.ietf.org/html/rfc3986'
  );
  expect(uriSchema.validate('udp://3domain.local')).toBe('udp://3domain.local');
  expect(uriSchema.validate('urn:elastic:kibana')).toBe('urn:elastic:kibana');
  expect(uriSchema.validate('ftp://ftp.ietf.org/rfc/rfc3986.txt')).toBe(
    'ftp://ftp.ietf.org/rfc/rfc3986.txt'
  );
  expect(uriSchema.validate('mailto:Platform.Kibana@elastic.co')).toBe(
    'mailto:Platform.Kibana@elastic.co'
  );
  expect(uriSchema.validate('tel:+500-111-222-333')).toBe('tel:+500-111-222-333');
  expect(uriSchema.validate('file:///kibana.log')).toBe('file:///kibana.log');
  expect(uriSchema.validate('http://elastic@localhost:9200')).toBe('http://elastic@localhost:9200');
  expect(uriSchema.validate('http://elastic:changeme@localhost:9200')).toBe(
    'http://elastic:changeme@localhost:9200'
  );
  expect(uriSchema.validate('ldap://[2001:db8::7]/c=GB?objectClass?one')).toBe(
    'ldap://[2001:db8::7]/c=GB?objectClass?one'
  );

  const uriWithMaxAllowedLength = `http://${'a'.repeat(255)}`;
  expect(uriSchema.validate(uriWithMaxAllowedLength)).toBe(uriWithMaxAllowedLength);
});

test('returns error when value is not a URI', () => {
  const uriSchema = schema.uri();

  expect(() => uriSchema.validate('3domain.local')).toThrowErrorMatchingInlineSnapshot(
    `"value must be a valid URI (see RFC 3986)."`
  );
  expect(() =>
    uriSchema.validate('http://8010:0:0:0:9:500:300C:200A')
  ).toThrowErrorMatchingInlineSnapshot(`"value must be a valid URI (see RFC 3986)."`);
  expect(() => uriSchema.validate('-')).toThrowErrorMatchingInlineSnapshot(
    `"value must be a valid URI (see RFC 3986)."`
  );
  expect(() =>
    uriSchema.validate('https://example.com?baz[]=foo&baz[]=bar')
  ).toThrowErrorMatchingInlineSnapshot(`"value must be a valid URI (see RFC 3986)."`);

  const tooLongUri = `http://${'a'.repeat(256)}`;
  expect(() => uriSchema.validate(tooLongUri)).toThrowErrorMatchingInlineSnapshot(
    `"value must be a valid URI (see RFC 3986)."`
  );
});

describe('#scheme', () => {
  test('returns value when URI has required scheme', () => {
    const uriSchema = schema.uri({ scheme: ['http', 'https'] });

    expect(uriSchema.validate('http://elastic.co')).toBe('http://elastic.co');
    expect(uriSchema.validate('https://elastic.co')).toBe('https://elastic.co');
  });

  test('returns error when shorter string', () => {
    const uriSchema = schema.uri({ scheme: ['http', 'https'] });

    expect(() => uriSchema.validate('ftp://elastic.co')).toThrowErrorMatchingInlineSnapshot(
      `"expected URI with scheme [http|https]."`
    );
    expect(() => uriSchema.validate('file:///kibana.log')).toThrowErrorMatchingInlineSnapshot(
      `"expected URI with scheme [http|https]."`
    );
  });
});

describe('#defaultValue', () => {
  test('returns default when URI is undefined', () => {
    expect(schema.uri({ defaultValue: 'http://localhost:9200' }).validate(undefined)).toBe(
      'http://localhost:9200'
    );
  });

  test('returns value when specified', () => {
    expect(
      schema.uri({ defaultValue: 'http://localhost:9200' }).validate('http://kibana.local')
    ).toBe('http://kibana.local');
  });

  test('returns value from context when context reference is specified', () => {
    expect(
      schema.uri({ defaultValue: schema.contextRef('some_uri') }).validate(undefined, {
        some_uri: 'http://kibana.local',
      })
    ).toBe('http://kibana.local');
  });
});

describe('#validate', () => {
  test('is called with input value', () => {
    let calledWith;

    const validator = (val: any) => {
      calledWith = val;
    };

    schema.uri({ validate: validator }).validate('http://kibana.local');

    expect(calledWith).toBe('http://kibana.local');
  });

  test('is not called with default value in no input', () => {
    const validate = jest.fn();

    schema.uri({ validate, defaultValue: 'http://kibana.local' }).validate(undefined);

    expect(validate).not.toHaveBeenCalled();
  });

  test('throws when returns string', () => {
    const validate = () => 'validator failure';

    expect(() =>
      schema.uri({ validate }).validate('http://kibana.local')
    ).toThrowErrorMatchingInlineSnapshot(`"validator failure"`);
  });
});

test('returns error when not string', () => {
  expect(() => schema.uri().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]."`
  );

  expect(() => schema.uri().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [Array]."`
  );

  expect(() => schema.uri().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [RegExp]."`
  );
});
