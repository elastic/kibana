/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { createRewritePolicyMock, resetAllMocks } from './rewrite_appender.test.mocks';
import { rewriteAppenderMocks } from './mocks';
import { LogLevel, LogRecord, LogMeta, DisposableAppender } from '@kbn/logging';
import { RewriteAppender, RewriteAppenderConfig } from './rewrite_appender';

// Helper to ensure tuple is typed [A, B] instead of Array<A | B>
const toTuple = <A, B>(a: A, b: B): [A, B] => [a, b];

const createAppenderMock = (name: string) => {
  const appenderMock: MockedKeys<DisposableAppender> = {
    append: jest.fn(),
    dispose: jest.fn(),
  };

  return toTuple(name, appenderMock);
};

const createConfig = (appenderNames: string[]): RewriteAppenderConfig => ({
  type: 'rewrite',
  appenders: appenderNames,
  policy: {
    type: 'meta',
    mode: 'update',
    properties: [{ path: 'foo', value: 'bar' }],
  },
});

const createLogRecord = (meta: LogMeta = {}): LogRecord => ({
  timestamp: new Date(),
  level: LogLevel.Info,
  context: 'context',
  message: 'just a log',
  pid: 42,
  meta,
});

describe('RewriteAppender', () => {
  let policy: ReturnType<typeof rewriteAppenderMocks.createPolicy>;

  beforeEach(() => {
    policy = rewriteAppenderMocks.createPolicy();
    createRewritePolicyMock.mockReturnValue(policy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    resetAllMocks();
  });

  it('creates a rewrite policy with the provided config', () => {
    const config = createConfig([]);
    new RewriteAppender(config);
    expect(createRewritePolicyMock).toHaveBeenCalledTimes(1);
    expect(createRewritePolicyMock).toHaveBeenCalledWith(config.policy);
  });

  describe('#addAppender', () => {
    it('updates the map of available appenders', () => {
      const config = createConfig(['mock1']);
      const appender = new RewriteAppender(config);
      appender.addAppender(...createAppenderMock('mock1'));
      expect(() => {
        appender.append(createLogRecord());
      }).not.toThrowError();
    });
  });

  describe('#append', () => {
    it('calls the configured appenders with the provided LogRecord', () => {
      const config = createConfig(['mock1', 'mock2']);
      const appenderMocks = [createAppenderMock('mock1'), createAppenderMock('mock2')];

      const appender = new RewriteAppender(config);
      appenderMocks.forEach((mock) => appender.addAppender(...mock));

      const log1 = createLogRecord({ user_agent: { name: 'a' } });
      const log2 = createLogRecord({ user_agent: { name: 'b' } });

      appender.append(log1);

      expect(appenderMocks[0][1].append).toHaveBeenCalledTimes(1);
      expect(appenderMocks[1][1].append).toHaveBeenCalledTimes(1);
      expect(appenderMocks[0][1].append).toHaveBeenCalledWith(log1);
      expect(appenderMocks[1][1].append).toHaveBeenCalledWith(log1);

      appender.append(log2);

      expect(appenderMocks[0][1].append).toHaveBeenCalledTimes(2);
      expect(appenderMocks[1][1].append).toHaveBeenCalledTimes(2);
      expect(appenderMocks[0][1].append).toHaveBeenCalledWith(log2);
      expect(appenderMocks[1][1].append).toHaveBeenCalledWith(log2);
    });

    it('calls `rewrite` on the configured policy', () => {
      const config = createConfig(['mock1']);

      const appender = new RewriteAppender(config);
      appender.addAppender(...createAppenderMock('mock1'));

      const log1 = createLogRecord({ user_agent: { name: 'a' } });
      const log2 = createLogRecord({ user_agent: { name: 'b' } });

      appender.append(log1);

      expect(policy.rewrite).toHaveBeenCalledTimes(1);
      expect(policy.rewrite.mock.calls).toEqual([[log1]]);

      appender.append(log2);

      expect(policy.rewrite).toHaveBeenCalledTimes(2);
      expect(policy.rewrite.mock.calls).toEqual([[log1], [log2]]);
    });

    it('throws if an appender key cannot be found', () => {
      const config = createConfig(['oops']);
      const appender = new RewriteAppender(config);

      expect(() => {
        appender.append(createLogRecord());
      }).toThrowErrorMatchingInlineSnapshot(
        `"Rewrite Appender could not find appender key \\"oops\\". Be sure \`appender.addAppender()\` was called before \`appender.append()\`."`
      );
    });
  });
});
