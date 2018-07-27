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

import { BehaviorSubject } from '../../../lib/kbn_observable';
import { MutableLoggerFactory } from '../logger_factory';
import { LoggingConfig } from '../logging_config';
import { LoggingService } from '../logging_service';

const createConfig = () => {
  return new LoggingConfig({
    appenders: new Map(),
    loggers: [],
    root: {
      appenders: ['default'],
      level: 'info',
    },
  });
};

const getLastMockCallArgs = (mockFunction: jest.Mock<(config: LoggingConfig) => void>) => {
  expect(mockFunction).toHaveBeenCalled();
  return mockFunction.mock.calls[mockFunction.mock.calls.length - 1];
};

let factory: MutableLoggerFactory;
let service: LoggingService;
let updateConfigMock: jest.Mock<(config: LoggingConfig) => void>;

beforeEach(() => {
  factory = new MutableLoggerFactory({} as any);
  updateConfigMock = jest.spyOn(factory, 'updateConfig').mockImplementation(() => {
    // noop
  });
  jest.spyOn(factory, 'close').mockImplementation(() => {
    // noop
  });

  service = new LoggingService(factory);
});

test('`upgrade()` updates logging factory config.', () => {
  expect(factory.updateConfig).not.toHaveBeenCalled();

  const config = createConfig();
  const config$ = new BehaviorSubject<LoggingConfig>(config);

  service.upgrade(config$.asObservable());

  expect(updateConfigMock).toHaveBeenCalledTimes(1);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(config);

  const newConfig = createConfig();
  config$.next(newConfig);
  expect(updateConfigMock).toHaveBeenCalledTimes(2);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(newConfig);
});

test('`stop()` closes logger factory and stops config updates.', async () => {
  const config$ = new BehaviorSubject<LoggingConfig>(createConfig());

  service.upgrade(config$.asObservable());
  updateConfigMock.mockReset();

  await service.stop();

  expect(factory.close).toHaveBeenCalled();

  config$.next(createConfig());
  expect(updateConfigMock).not.toHaveBeenCalled();
});
