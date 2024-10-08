/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { config } from './config';

describe('config', () => {
  const baseContext = {
    dist: true,
    serverless: false,
  };

  describe('expect different defaults', () => {
    test('on non-distributable', () => {
      expect(config.schema.validate({}, { ...baseContext, dist: false })).toEqual(
        expect.objectContaining({
          sendUsageTo: 'staging',
        })
      );
    });

    test('on distributable', () => {
      expect(config.schema.validate({}, { ...baseContext, dist: true })).toEqual(
        expect.objectContaining({
          sendUsageTo: 'prod',
        })
      );
    });

    test('on non-serverless', () => {
      expect(config.schema.validate({}, { ...baseContext, serverless: false })).toEqual(
        expect.objectContaining({
          appendServerlessChannelsSuffix: false,
        })
      );
    });

    test('on serverless', () => {
      expect(config.schema.validate({}, { ...baseContext, serverless: true })).toEqual(
        expect.objectContaining({
          appendServerlessChannelsSuffix: true,
        })
      );
    });
  });

  describe('appendServerlessChannelsSuffix', () => {
    test.each([true, false])(
      'do not allow changing the default value (serverless: %p)',
      (serverless) => {
        expect(() =>
          config.schema.validate(
            { appendServerlessChannelsSuffix: !serverless },
            { ...baseContext, serverless }
          )
        ).toThrow();
      }
    );
  });
});
