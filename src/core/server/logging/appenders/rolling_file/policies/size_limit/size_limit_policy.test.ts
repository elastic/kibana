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
