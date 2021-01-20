/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { of, Subject } from 'rxjs';

import { LoggingService, InternalLoggingServiceSetup } from './logging_service';
import { loggingSystemMock } from './logging_system.mock';
import { LoggerContextConfigType } from './logging_config';

describe('LoggingService', () => {
  let loggingSystem: ReturnType<typeof loggingSystemMock.create>;
  let service: LoggingService;
  let setup: InternalLoggingServiceSetup;

  beforeEach(() => {
    loggingSystem = loggingSystemMock.create();
    service = new LoggingService({ logger: loggingSystem.asLoggerFactory() } as any);
    setup = service.setup({ loggingSystem });
  });
  afterEach(() => {
    service.stop();
  });

  describe('setup', () => {
    it('forwards configuration changes to logging system', () => {
      const config1: LoggerContextConfigType = {
        appenders: new Map(),
        loggers: [{ context: 'subcontext', appenders: ['console'], level: 'warn' }],
      };
      const config2: LoggerContextConfigType = {
        appenders: new Map(),
        loggers: [{ context: 'subcontext', appenders: ['default'], level: 'all' }],
      };

      setup.configure(['test', 'context'], of(config1, config2));
      expect(loggingSystem.setContextConfig).toHaveBeenNthCalledWith(
        1,
        ['test', 'context'],
        config1
      );
      expect(loggingSystem.setContextConfig).toHaveBeenNthCalledWith(
        2,
        ['test', 'context'],
        config2
      );
    });

    it('stops forwarding first observable when called a second time', () => {
      const updates$ = new Subject<LoggerContextConfigType>();
      const config1: LoggerContextConfigType = {
        appenders: new Map(),
        loggers: [{ context: 'subcontext', appenders: ['console'], level: 'warn' }],
      };
      const config2: LoggerContextConfigType = {
        appenders: new Map(),
        loggers: [{ context: 'subcontext', appenders: ['default'], level: 'all' }],
      };

      setup.configure(['test', 'context'], updates$);
      setup.configure(['test', 'context'], of(config1));
      updates$.next(config2);
      expect(loggingSystem.setContextConfig).toHaveBeenNthCalledWith(
        1,
        ['test', 'context'],
        config1
      );
      expect(loggingSystem.setContextConfig).not.toHaveBeenCalledWith(['test', 'context'], config2);
    });
  });

  describe('stop', () => {
    it('stops forwarding updates to logging system', () => {
      const updates$ = new Subject<LoggerContextConfigType>();
      const config1: LoggerContextConfigType = {
        appenders: new Map(),
        loggers: [{ context: 'subcontext', appenders: ['console'], level: 'warn' }],
      };

      setup.configure(['test', 'context'], updates$);
      service.stop();
      updates$.next(config1);
      expect(loggingSystem.setContextConfig).not.toHaveBeenCalledWith(['test', 'context'], config1);
    });
  });
});
