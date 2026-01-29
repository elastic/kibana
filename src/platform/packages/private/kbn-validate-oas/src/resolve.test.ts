/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * NOTE: this file was copy-pasted and converted to TS from:
 *       https://github.com/seriousme/openapi-schema-validator/blob/v2.7.0/test/test-resolve.js
 */

import { resolve } from './resolve';

test('non object returns undefined', () => {
  const schema = 'schema';
  const res = resolve(schema, true);
  expect(res).toBe(undefined);
});

test('Local $refs', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      address: {
        type: 'object',
        properties: {
          street_address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          subAddress: { $ref: 'http://www.example.com/#/definitions/address' },
        },
      },
      req: { required: ['billing_address'] },
    },
    type: 'object',
    properties: {
      billing_address: { $ref: '#/definitions/address' },
      shipping_address: { $ref: '#/definitions/address' },
    },
  };
  const res = resolve(schema, true) as any;
  const ptr = res.properties.billing_address.properties;
  expect(ptr.city.type).toBe('string');
  const circular = ptr.subAddress.properties;
  expect(circular.city.type).toBe('string');
});

test('number in path', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      2: {
        required: ['billing_address'],
      },
    },
    $ref: '#/definitions/2',
  };
  const res = resolve(schema, true) as any;
  expect(res.required[0]).toBe('billing_address');
});

test('ref to #', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      2: {
        required: ['billing_address'],
      },
    },
    $ref: '#',
  };
  const res = resolve(schema, true) as any;
  expect(res.definitions[2].required[0]).toBe('billing_address');
});

test('$ref to $anchor', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      req: {
        required: ['billing_address'],
        $anchor: 'myAnchor',
      },
    },
    $ref: '#myAnchor',
  };
  const res = resolve(schema, true) as any;
  expect(res.required[0]).toBe('billing_address');
});

test('$dynamicRef to $dynamicAnchor', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      req: {
        required: ['billing_address'],
        $dynamicAnchor: 'myAnchor',
      },
    },
    $dynamicRef: '#myAnchor',
  };
  const res = resolve(schema, true) as any;
  expect(res.required[0]).toBe('billing_address');
});

test('non-existing path throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    $ref: '#/definitions/req',
  };
  expect(() => resolve(schema, true)).toThrow(
    "Can't resolve http://www.example.com/#/definitions/req, only internal refs are supported."
  );
});

test('non-existing leaf path throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      req: { required: ['billing_address'] },
    },
    $ref: '#/definitions/non-existing',
  };
  expect(() => resolve(schema, true)).toThrow(
    "Can't resolve http://www.example.com/#/definitions/non-existing, only internal refs are supported."
  );
});

test('non-existing uri throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      req: { required: ['billing_address'] },
    },
    $ref: 'http://www.example.com/failed#/definitions/req',
  };
  expect(() => resolve(schema, true)).toThrow(
    "Can't resolve http://www.example.com/failed#/definitions/req, only internal refs are supported."
  );
});

test('non-existing uri without path throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      req: { required: ['billing_address'] },
    },
    $ref: 'http://www.example.com/failed',
  };
  expect(() => resolve(schema, true)).toThrow(
    "Can't resolve http://www.example.com/failed, only internal refs are supported."
  );
});

test('non-existing $anchor throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    $ref: '#undefinedAnchor',
  };
  expect(() => resolve(schema, true)).toThrow(
    "Can't resolve http://www.example.com/#undefinedAnchor, only internal refs are supported."
  );
});

test('non-existing $dynamicAnchor throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    $dynamicRef: '#undefinedAnchor',
  };
  expect(() => resolve(schema, true)).toThrow("Can't resolve $dynamicAnchor : '#undefinedAnchor'");
});

test('non-unique $id throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      $id: 'http://www.example.com/',
    },
  };
  expect(() => resolve(schema, true)).toThrow(
    "$id : 'http://www.example.com/' defined more than once at #/definitions"
  );
});

test('non-unique $anchor throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      anchorA: { $anchor: '#myAnchor' },
      anchorB: { $anchor: '#myAnchor' },
    },
  };
  expect(() => resolve(schema, true)).toThrow(
    "$anchor : '#myAnchor' defined more than once at '#/definitions/anchorB'"
  );
});

test('non-unique $dynamicAnchor throws error', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: {
      anchorA: { $dynamicAnchor: '#myAnchor' },
      anchorB: { $dynamicAnchor: '#myAnchor' },
    },
  };
  expect(() => resolve(schema, true)).toThrow(
    "$dynamicAnchor : '#myAnchor' defined more than once at '#/definitions/anchorB'"
  );
});

test('correctly URL encoded URI', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      '/path{id}': {
        required: ['billing_address'],
      },
    },
    $ref: '%23%2Fdefinitions%2F~1path%7Bid%7D', // "#/definitions/~1path{id}"
  };
  const res = resolve(schema, true) as any;
  expect(res.required[0]).toBe('billing_address');
});

test('incorrectly URL encoded URI also works (normally blocked by schema format)', () => {
  const schema = {
    $id: 'http://www.example.com/',
    $schema: 'http://json-schema.org/draft-07/schema#',

    definitions: {
      '/path{id}': {
        required: ['billing_address'],
      },
    },
    $ref: '#/definitions/~1path{id}',
  };
  const res = resolve(schema, true) as any;
  expect(res.required[0]).toBe('billing_address');
});
