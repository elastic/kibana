/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Supervisor } from './supervisor';
import { getDefaultTools, splitArgs } from './tools';
import type { ProcessDefinition } from './types';

describe('splitArgs', () => {
  it('splits on whitespace and keeps quoted parts together', () => {
    expect(splitArgs('  logs_and_metrics   --live ')).toEqual(['logs_and_metrics', '--live']);
    expect(splitArgs(`--scenarioOpts "a b" --x='c d' ""`)).toEqual([
      '--scenarioOpts',
      'a b',
      '--x=c d',
      '',
    ]);
    expect(splitArgs('')).toEqual([]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => splitArgs('--scenarioOpts "a b')).toThrow('Unclosed " in the arguments');
  });
});

describe('getDefaultTools', () => {
  it('runs each script with the arguments the user set', () => {
    const tools = getDefaultTools('/repo');
    expect(tools.map(({ id, dependsOn }) => [id, dependsOn])).toEqual([
      ['synthtrace', ['kibana']],
      ['connector-emulator', []],
      ['data-forge', ['es']],
    ]);
    const [synthtrace] = tools;
    const { tool, args } = synthtrace;
    if (!tool || typeof args !== 'function') {
      throw new Error('expected a tool with computed arguments');
    }
    expect(args()).toEqual(['/repo/scripts/synthtrace', 'logs_and_metrics', '--live']);

    tool.setArgs('sre_incidents --from=now-1h --to=now');
    expect(tool.getArgs()).toBe('sre_incidents --from=now-1h --to=now');
    expect(args()).toEqual([
      '/repo/scripts/synthtrace',
      'sre_incidents',
      '--from=now-1h',
      '--to=now',
    ]);

    expect(() => tool.setArgs('"open')).toThrow('Unclosed');
    expect(tool.getArgs()).toBe('sre_incidents --from=now-1h --to=now');
  });
});

describe('Supervisor with tools', () => {
  it('starts tools only when asked', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-tools-'));
    const definition = (id: string, rest: Partial<ProcessDefinition> = {}): ProcessDefinition => ({
      id,
      command: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000);'],
      ready: { type: 'spawned' },
      stopTimeoutMs: 2000,
      ...rest,
    });
    const supervisor = new Supervisor({
      logDir,
      definitions: [
        definition('es'),
        definition('synthtrace', {
          dependsOn: ['es'],
          tool: { description: 'test', getArgs: () => '', setArgs: () => {} },
        }),
      ],
    });
    const state = (id: string) =>
      supervisor.getStatus().processes.find((status) => status.id === id)?.state;
    try {
      await supervisor.startAll();
      expect(state('es')).toBe('ready');
      expect(state('synthtrace')).toBe('stopped');
      expect(supervisor.getTool('synthtrace')?.description).toBe('test');

      await supervisor.start('synthtrace');
      expect(state('synthtrace')).toBe('ready');
    } finally {
      await supervisor.stopAll();
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });
});
