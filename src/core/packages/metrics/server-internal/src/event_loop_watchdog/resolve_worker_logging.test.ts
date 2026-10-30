/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveWorkerLogging } from './resolve_worker_logging';

const LOGGER = 'metrics.event_loop_watchdog';
const serviceFields = { nodeRoles: ['background_tasks', 'ui'], version: '9.3.0' };
const resolve = (config: Parameters<typeof resolveWorkerLogging>[0]) =>
  resolveWorkerLogging(config, LOGGER, serviceFields);

describe('resolveWorkerLogging', () => {
  it('uses the root defaults: info level, text format through the default appender', () => {
    expect(resolve({})).toEqual({
      context: LOGGER,
      level: 'info',
      format: 'text',
      service: { node: { roles: ['background_tasks', 'ui'] }, version: '9.3.0', type: 'kibana' },
    });
  });

  it('uses json when a console appender has a json layout', () => {
    const config = resolve({
      appenders: new Map([['console-json', { type: 'console', layout: { type: 'json' } }]]),
      root: { appenders: ['console-json'] },
    });
    expect(config.format).toBe('json');
  });

  it('uses a redefined default appender', () => {
    const config = resolve({
      appenders: new Map([['default', { type: 'console', layout: { type: 'json' } }]]),
    });
    expect(config.format).toBe('json');
  });

  it('prefers json when the console appenders mix layouts', () => {
    const config = resolve({
      appenders: new Map([['console-json', { type: 'console', layout: { type: 'json' } }]]),
      root: { appenders: ['console', 'console-json'] },
    });
    expect(config.format).toBe('json');
  });

  it('writes nothing without a console appender', () => {
    const config = resolve({
      appenders: new Map([['file', { type: 'file', layout: { type: 'json' } }]]),
      root: { appenders: ['file'] },
    });
    expect(config.format).toBeUndefined();
  });

  it('takes the level from the closest logger in the chain', () => {
    expect(resolve({ loggers: [{ name: 'metrics', level: 'debug' }] }).level).toBe('debug');
    expect(
      resolve({
        loggers: [
          { name: 'metrics', level: 'debug' },
          { name: LOGGER, level: 'warn' },
        ],
      }).level
    ).toBe('warn');
    expect(resolve({ root: { level: 'error' } }).level).toBe('error');
  });

  it('falls back to root when no logger in the chain is configured', () => {
    expect(resolve({ loggers: [{ name: 'http', level: 'debug' }] }).level).toBe('info');
  });

  it('resolves appenders separately from the level', () => {
    const config = resolve({
      appenders: new Map([['file', { type: 'file' }]]),
      loggers: [
        { name: 'metrics', appenders: ['file'] },
        { name: LOGGER, level: 'debug' },
      ],
    });
    expect(config).toMatchObject({ level: 'debug', format: undefined });
  });
});
