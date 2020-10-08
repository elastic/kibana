/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
