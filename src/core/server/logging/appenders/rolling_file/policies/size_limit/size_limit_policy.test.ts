/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { LogRecord, LogLevel } from '@kbn/logging';
import { SizeLimitTriggeringPolicy } from './size_limit_policy';
import { RollingFileContext } from '../../rolling_file_context';

describe('SizeLimitTriggeringPolicy', () => {
  let context: RollingFileContext;

  const createPolicy = (size: ByteSizeValue) =>
    new SizeLimitTriggeringPolicy({ kind: 'size-limit', size }, context);

  const createLogRecord = (parts: Partial<LogRecord> = {}): LogRecord => ({
    timestamp: new Date(),
    level: LogLevel.Info,
    context: 'context',
    message: 'just a log',
    pid: 42,
    ...parts,
  });

  const isTriggering = ({ fileSize, maxSize }: { maxSize: string; fileSize: string }) => {
    const policy = createPolicy(ByteSizeValue.parse(maxSize));
    context.currentFileSize = ByteSizeValue.parse(fileSize).getValueInBytes();
    return policy.isTriggeringEvent(createLogRecord());
  };

  beforeEach(() => {
    context = new RollingFileContext('foo.log');
  });

  it('triggers a rollover when the file size exceeds the max size', () => {
    expect(
      isTriggering({
        fileSize: '70b',
        maxSize: '50b',
      })
    ).toBeTruthy();
  });

  it('triggers a rollover when the file size equals the max size', () => {
    expect(
      isTriggering({
        fileSize: '20b',
        maxSize: '20b',
      })
    ).toBeTruthy();
  });

  it('does not triggers a rollover when the file size did not rea h the max size', () => {
    expect(
      isTriggering({
        fileSize: '20b',
        maxSize: '50b',
      })
    ).toBeFalsy();
  });
});
