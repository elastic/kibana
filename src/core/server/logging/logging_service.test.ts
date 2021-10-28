/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of, Subject } from 'rxjs';

import {
  LoggingService,
  InternalLoggingServiceSetup,
  InternalLoggingServicePreboot,
} from './logging_service';
import { loggingSystemMock } from './logging_system.mock';
import { LoggerContextConfigType } from './logging_config';

describe('LoggingService', () => {
  let loggingSystem: ReturnType<typeof loggingSystemMock.create>;
  let service: LoggingService;
  let preboot: InternalLoggingServicePreboot;

  beforeEach(() => {
    loggingSystem = loggingSystemMock.create();
    service = new LoggingService({ logger: loggingSystem.asLoggerFactory() } as any);
    preboot = service.preboot({ loggingSystem });
  });
  afterEach(() => {
    service.stop();
  });

  function runTestSuite(
    testSuiteName: string,
    getContract: () => InternalLoggingServicePreboot | InternalLoggingServiceSetup
  ) {
    describe(testSuiteName, () => {
      it('forwards configuration changes to logging system', async () => {
        const config1: LoggerContextConfigType = {
          appenders: new Map(),
          loggers: [{ name: 'subcontext', appenders: ['console'], level: 'warn' }],
        };
        const config2: LoggerContextConfigType = {
          appenders: new Map(),
          loggers: [{ name: 'subcontext', appenders: ['default'], level: 'all' }],
        };

        getContract().configure(['test', 'context'], of(config1, config2));
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
          loggers: [{ name: 'subcontext', appenders: ['console'], level: 'warn' }],
        };
        const config2: LoggerContextConfigType = {
          appenders: new Map(),
          loggers: [{ name: 'subcontext', appenders: ['default'], level: 'all' }],
        };

        const contract = getContract();
        contract.configure(['test', 'context'], updates$);
        contract.configure(['test', 'context'], of(config1));
        updates$.next(config2);
        expect(loggingSystem.setContextConfig).toHaveBeenNthCalledWith(
          1,
          ['test', 'context'],
          config1
        );
        expect(loggingSystem.setContextConfig).not.toHaveBeenCalledWith(
          ['test', 'context'],
          config2
        );
      });
    });

    describe(`stop after ${testSuiteName}`, () => {
      it('stops forwarding updates to logging system', () => {
        const updates$ = new Subject<LoggerContextConfigType>();
        const config1: LoggerContextConfigType = {
          appenders: new Map(),
          loggers: [{ name: 'subcontext', appenders: ['console'], level: 'warn' }],
        };

        getContract().configure(['test', 'context'], updates$);
        service.stop();
        updates$.next(config1);
        expect(loggingSystem.setContextConfig).not.toHaveBeenCalledWith(
          ['test', 'context'],
          config1
        );
      });
    });
  }

  runTestSuite('preboot', () => preboot);
  runTestSuite('setup', () => service.setup());
});
