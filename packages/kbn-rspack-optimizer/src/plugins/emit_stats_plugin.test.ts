/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { EmitStatsPlugin } from './emit_stats_plugin';

describe('EmitStatsPlugin.writeStatsSync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-test-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes valid JSON that roundtrips through parse', () => {
    const data = { hash: 'abc123', version: '5.0', timings: { total: 5000 } };
    const statsPath = Path.join(tmpDir, 'stats.json');

    EmitStatsPlugin.writeStatsSync(statsPath, data);

    const parsed = JSON.parse(Fs.readFileSync(statsPath, 'utf-8'));
    expect(parsed).toEqual(data);
  });

  it('omits keys with undefined values', () => {
    const data = { hash: 'abc', version: undefined, timings: 100 };
    const statsPath = Path.join(tmpDir, 'stats.json');

    EmitStatsPlugin.writeStatsSync(statsPath, data as any);

    const parsed = JSON.parse(Fs.readFileSync(statsPath, 'utf-8'));
    expect(parsed).toEqual({ hash: 'abc', timings: 100 });
    expect(parsed).not.toHaveProperty('version');
  });

  it('gracefully skips values that throw on JSON.stringify without crashing', () => {
    const circular: Record<string, any> = { name: 'test' };
    circular.self = circular;

    const data = { bad: circular, good: 'value' };
    const statsPath = Path.join(tmpDir, 'stats.json');

    expect(() => EmitStatsPlugin.writeStatsSync(statsPath, data)).not.toThrow();

    const content = Fs.readFileSync(statsPath, 'utf-8');
    expect(content).toContain('"good"');
    expect(content).not.toContain('"bad"');
  });
});

describe('EmitStatsPlugin.apply', () => {
  it('taps into afterDone hook', () => {
    const tapFn = jest.fn();
    const mockCompiler = {
      hooks: {
        afterDone: { tap: tapFn },
      },
    };

    const plugin = new EmitStatsPlugin('/tmp/output');
    plugin.apply(mockCompiler as any);

    expect(tapFn).toHaveBeenCalledWith('EmitStatsPlugin', expect.any(Function));
  });
});
