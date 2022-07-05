/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { externalUrlConfig } from './config';

describe('externalUrl config', () => {
  it('provides a default policy allowing all external urls', () => {
    expect(externalUrlConfig.schema.validate({})).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
          },
        ],
      }
    `);
  });

  it('allows an empty policy', () => {
    expect(externalUrlConfig.schema.validate({ policy: [] })).toMatchInlineSnapshot(`
      Object {
        "policy": Array [],
      }
    `);
  });

  it('allows a policy with just a protocol', () => {
    expect(
      externalUrlConfig.schema.validate({
        policy: [
          {
            allow: true,
            protocol: 'http',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "protocol": "http",
          },
        ],
      }
    `);
  });

  it('allows a policy with just a host', () => {
    expect(
      externalUrlConfig.schema.validate({
        policy: [
          {
            allow: true,
            host: 'www.google.com',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "host": "www.google.com",
          },
        ],
      }
    `);
  });

  it('allows a policy with both host and protocol', () => {
    expect(
      externalUrlConfig.schema.validate({
        policy: [
          {
            allow: true,
            protocol: 'http',
            host: 'www.google.com',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "host": "www.google.com",
            "protocol": "http",
          },
        ],
      }
    `);
  });

  it('allows a policy without a host or protocol', () => {
    expect(
      externalUrlConfig.schema.validate({
        policy: [
          {
            allow: true,
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
          },
        ],
      }
    `);
  });

  describe('protocols', () => {
    ['http', 'https', 'ftp', 'ftps', 'custom-protocol+123.bar'].forEach((protocol) => {
      it(`allows a protocol of "${protocol}"`, () => {
        externalUrlConfig.schema.validate({
          policy: [
            {
              allow: true,
              protocol,
            },
          ],
        });
      });
    });

    ['1http', '', 'custom-protocol()', 'https://'].forEach((protocol) => {
      it(`disallows a protocol of "${protocol}"`, () => {
        expect(() =>
          externalUrlConfig.schema.validate({
            policy: [
              {
                allow: true,
                protocol,
              },
            ],
          })
        ).toThrowError();
      });
    });
  });
});
