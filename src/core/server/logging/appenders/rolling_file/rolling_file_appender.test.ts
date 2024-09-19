/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createRollingStrategyMock,
  createTriggeringPolicyMock,
  LayoutsMock,
  resetAllMocks,
  RollingFileContextMock,
  RollingFileManagerMock,
} from './rolling_file_appender.test.mocks';
import { rollingFileAppenderMocks } from './mocks';
import moment from 'moment-timezone';
import { LogLevel, LogRecord } from '@kbn/logging';
import { RollingFileAppender, RollingFileAppenderConfig } from './rolling_file_appender';

const config: RollingFileAppenderConfig = {
  type: 'rolling-file',
  fileName: '/var/log/kibana.log',
  layout: {
    type: 'pattern',
    pattern: '%message',
    highlight: false,
  },
  policy: {
    type: 'time-interval',
    interval: moment.duration(4, 'hour'),
    modulate: true,
  },
  strategy: {
    type: 'numeric',
    max: 5,
    pattern: '-%i',
  },
};

const createLogRecord = (parts: Partial<LogRecord> = {}): LogRecord => ({
  timestamp: new Date(),
  level: LogLevel.Info,
  context: 'context',
  message: 'just a log',
  pid: 42,
  ...parts,
});

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 10));

const createPromiseResolver = () => {
  let resolve: () => void;
  let reject: () => void;
  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
};

describe('RollingFileAppender', () => {
  let appender: RollingFileAppender;

  let layout: ReturnType<typeof rollingFileAppenderMocks.createLayout>;
  let strategy: ReturnType<typeof rollingFileAppenderMocks.createStrategy>;
  let policy: ReturnType<typeof rollingFileAppenderMocks.createPolicy>;
  let context: ReturnType<typeof rollingFileAppenderMocks.createContext>;
  let fileManager: ReturnType<typeof rollingFileAppenderMocks.createFileManager>;

  beforeEach(() => {
    layout = rollingFileAppenderMocks.createLayout();
    LayoutsMock.create.mockReturnValue(layout);

    policy = rollingFileAppenderMocks.createPolicy();
    createTriggeringPolicyMock.mockReturnValue(policy);

    strategy = rollingFileAppenderMocks.createStrategy();
    createRollingStrategyMock.mockReturnValue(strategy);

    context = rollingFileAppenderMocks.createContext('file-path');
    RollingFileContextMock.mockImplementation(() => context);

    fileManager = rollingFileAppenderMocks.createFileManager();
    RollingFileManagerMock.mockImplementation(() => fileManager);

    appender = new RollingFileAppender(config);
  });

  afterAll(() => {
    resetAllMocks();
  });

  it('constructs its delegates with the correct parameters', () => {
    expect(RollingFileContextMock).toHaveBeenCalledTimes(1);
    expect(RollingFileContextMock).toHaveBeenCalledWith(config.fileName);

    expect(RollingFileManagerMock).toHaveBeenCalledTimes(1);
    expect(RollingFileManagerMock).toHaveBeenCalledWith(context);

    expect(LayoutsMock.create).toHaveBeenCalledTimes(1);
    expect(LayoutsMock.create).toHaveBeenCalledWith(config.layout);

    expect(createTriggeringPolicyMock).toHaveBeenCalledTimes(1);
    expect(createTriggeringPolicyMock).toHaveBeenCalledWith(config.policy, context);

    expect(createRollingStrategyMock).toHaveBeenCalledTimes(1);
    expect(createRollingStrategyMock).toHaveBeenCalledWith(config.strategy, context);
  });

  describe('#append', () => {
    describe('when rollout is not needed', () => {
      beforeEach(() => {
        policy.isTriggeringEvent.mockReturnValue(false);
      });

      it('calls `layout.format` with the message', () => {
        const log1 = createLogRecord({ message: '1' });
        const log2 = createLogRecord({ message: '2' });

        appender.append(log1);

        expect(layout.format).toHaveBeenCalledTimes(1);
        expect(layout.format).toHaveBeenCalledWith(log1);

        appender.append(log2);

        expect(layout.format).toHaveBeenCalledTimes(2);
        expect(layout.format).toHaveBeenCalledWith(log2);
      });

      it('calls `fileManager.write` with the formatted message', () => {
        layout.format.mockImplementation(({ message }) => message);

        const log1 = createLogRecord({ message: '1' });
        const log2 = createLogRecord({ message: '2' });

        appender.append(log1);

        expect(fileManager.write).toHaveBeenCalledTimes(1);
        expect(fileManager.write).toHaveBeenCalledWith('1\n');

        appender.append(log2);

        expect(fileManager.write).toHaveBeenCalledTimes(2);
        expect(fileManager.write).toHaveBeenCalledWith('2\n');
      });
    });

    describe('when rollout is needed', () => {
      beforeEach(() => {
        policy.isTriggeringEvent.mockReturnValueOnce(true).mockReturnValue(false);
      });

      it('does not log the event triggering the rollout', () => {
        const log = createLogRecord({ message: '1' });
        appender.append(log);

        expect(layout.format).not.toHaveBeenCalled();
        expect(fileManager.write).not.toHaveBeenCalled();
      });

      it('triggers the rollout', () => {
        const log = createLogRecord({ message: '1' });
        appender.append(log);

        expect(strategy.rollout).toHaveBeenCalledTimes(1);
      });

      it('closes the manager stream once the rollout is complete', async () => {
        const { promise, resolve } = createPromiseResolver();
        strategy.rollout.mockReturnValue(promise);

        const log = createLogRecord({ message: '1' });
        appender.append(log);

        expect(fileManager.closeStream).not.toHaveBeenCalled();

        resolve();
        await nextTick();

        expect(fileManager.closeStream).toHaveBeenCalledTimes(1);
      });

      it('logs the event once the rollout is complete', async () => {
        const { promise, resolve } = createPromiseResolver();
        strategy.rollout.mockReturnValue(promise);

        const log = createLogRecord({ message: '1' });
        appender.append(log);

        expect(fileManager.write).not.toHaveBeenCalled();

        resolve();
        await nextTick();

        expect(fileManager.write).toHaveBeenCalledTimes(1);
      });

      it('logs any pending events once the rollout is complete', async () => {
        const { promise, resolve } = createPromiseResolver();
        strategy.rollout.mockReturnValue(promise);

        appender.append(createLogRecord({ message: '1' }));
        appender.append(createLogRecord({ message: '2' }));
        appender.append(createLogRecord({ message: '3' }));

        expect(fileManager.write).not.toHaveBeenCalled();

        resolve();
        await nextTick();

        expect(fileManager.write).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('#dispose', () => {
    it('closes the file manager', async () => {
      await appender.dispose();

      expect(fileManager.closeStream).toHaveBeenCalledTimes(1);
    });

    it('noops if called multiple times', async () => {
      await appender.dispose();

      expect(fileManager.closeStream).toHaveBeenCalledTimes(1);

      await appender.dispose();

      expect(fileManager.closeStream).toHaveBeenCalledTimes(1);
    });

    it('waits until the rollout completes if a rollout was in progress', async () => {
      expect.assertions(1);

      const { promise, resolve } = createPromiseResolver();
      let rolloutComplete = false;

      strategy.rollout.mockReturnValue(
        promise.then(() => {
          rolloutComplete = true;
        })
      );

      appender.append(createLogRecord({ message: '1' }));

      const dispose = appender.dispose().then(() => {
        expect(rolloutComplete).toEqual(true);
      });

      resolve();

      await Promise.all([dispose, promise]);
    });
  });
});
