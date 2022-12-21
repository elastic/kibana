/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigSchema } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(ConfigSchema.validate({})).toMatchInlineSnapshot(`
      Object {
        "connectionCheck": Object {
          "interval": "PT5S",
        },
        "enabled": true,
      }
    `);
  });

  describe('#connectionCheck', () => {
    it('should properly set required connection check interval', () => {
      expect(ConfigSchema.validate({ connectionCheck: { interval: '1s' } })).toMatchInlineSnapshot(`
        Object {
          "connectionCheck": Object {
            "interval": "PT1S",
          },
          "enabled": true,
        }
      `);
    });

    it('should throw error if interactiveSetup.connectionCheck.interval is less than 1 second', () => {
      expect(() =>
        ConfigSchema.validate({ connectionCheck: { interval: 100 } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[connectionCheck.interval]: the value must be greater or equal to 1 second."`
      );
    });
  });
});
