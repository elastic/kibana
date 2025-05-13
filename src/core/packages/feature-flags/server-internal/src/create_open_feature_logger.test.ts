/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger as OpenFeatureLogger } from '@openfeature/server-sdk';
import { type MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { createOpenFeatureLogger } from './create_open_feature_logger';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

describe('createOpenFeatureLogger', () => {
  let kbnLogger: MockedLogger;
  let openFeatureLogger: OpenFeatureLogger;

  beforeEach(() => {
    kbnLogger = loggerMock.create();
    openFeatureLogger = createOpenFeatureLogger(kbnLogger);
  });

  test.each(LOG_LEVELS)('should log.%s() a simple message', (logLevel) => {
    openFeatureLogger[logLevel]('message');
    expect(kbnLogger[logLevel]).toHaveBeenCalledWith('message', { extraArguments: [] });
  });

  test.each(LOG_LEVELS)('should log.%s() a message with 1 argument (non-error)', (logLevel) => {
    openFeatureLogger[logLevel]('message', 'something else');
    expect(kbnLogger[logLevel]).toHaveBeenCalledWith('message', {
      extraArguments: ['something else'],
    });
  });

  test.each(LOG_LEVELS)(
    'should log.%s() a message with 1 argument (error) in their expected ECS field',
    (logLevel) => {
      const error = new Error('Something went wrong');
      openFeatureLogger[logLevel]('An error occurred:', error);
      expect(kbnLogger[logLevel]).toHaveBeenCalledWith('An error occurred:', { error });
    }
  );

  test.each(LOG_LEVELS)('should log.%s() a message with additional arguments', (logLevel) => {
    openFeatureLogger[logLevel]('message', 'something else', 'another thing', { foo: 'bar' });
    expect(kbnLogger[logLevel]).toHaveBeenCalledWith('message', {
      extraArguments: ['something else', 'another thing', { foo: 'bar' }],
    });
  });
});
