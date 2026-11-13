/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

import { checkServerImportGraph } from './check_server_import_graph';

const fixture = (...segments: string[]): string =>
  Path.resolve(__dirname, '__fixtures__', ...segments);

const run = async (entry: string): Promise<{ passed: boolean; output: string }> => {
  const log = new ToolingLog();
  const writer = new ToolingLogCollectingWriter();
  log.setWriters([writer]);
  const passed = await checkServerImportGraph({ log, entryPaths: [entry] });
  return { passed, output: writer.messages.join('') };
};

describe('checkServerImportGraph', () => {
  it('fails on an @elastic/eui subpath reached through a dynamic import and a barrel', async () => {
    const { passed, output } = await run(fixture('plugin', 'server', 'index.ts'));

    expect(passed).toBe(false);
    expect(output).toContain('1 browser-only import(s)');
    expect(output).toContain('imports @elastic/eui (`@elastic/eui/lib/services`)');

    const chain = [
      ['plugin', 'server', 'index.ts'],
      ['plugin', 'server', 'plugin.ts'],
      ['plugin', 'common', 'index.ts'],
      ['plugin', 'common', 'color.ts'],
    ].map((segments) => Path.relative(REPO_ROOT, fixture(...segments)));
    const positions = chain.map((file, index) =>
      output.indexOf(`${'  '.repeat(index)}${index === 0 ? '' : '→ '}${file}`)
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('passes when @elastic/eui is only imported as a type', async () => {
    const { passed, output } = await run(fixture('clean_plugin', 'server', 'index.ts'));

    expect(passed).toBe(true);
    expect(output).toContain('2 source files reachable from 1 server entry points');
  });
});
