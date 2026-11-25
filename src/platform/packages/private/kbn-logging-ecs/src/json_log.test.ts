/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsVersion } from '@elastic/ecs';
import type { LogRecord } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
import { toEcsLog } from './json_log';

const record: LogRecord = {
  context: 'context-1',
  level: LogLevel.Warn,
  message: 'message-1',
  timestamp: new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11)),
  pid: 5355,
};

describe('toEcsLog', () => {
  it('uses the provided uptime and the ECS version', () => {
    const output = toEcsLog(record, 42);

    expect(output.process).toEqual({ pid: 5355, uptime: 42 });
    expect(output.ecs).toEqual({ version: EcsVersion });
    expect(output.log).toEqual({ level: 'WARN', logger: 'context-1' });
  });

  it('merges meta without letting it override record fields', () => {
    const output = toEcsLog(
      {
        ...record,
        meta: {
          '@timestamp': 'overridden',
          message: 'overridden',
          kibana: { foo: 'bar' },
        } as LogRecord['meta'],
      },
      1
    );

    expect(output.message).toBe('message-1');
    expect(output['@timestamp']).not.toBe('overridden');
    expect(output).toHaveProperty('kibana', { foo: 'bar' });
  });

  it('serializes the record error', () => {
    const output = toEcsLog(
      {
        ...record,
        error: { message: 'boom', name: 'TypeError', stack: 'stack' },
      },
      1
    );

    expect(output.error).toEqual({ message: 'boom', type: 'TypeError', stack_trace: 'stack' });
  });
});
