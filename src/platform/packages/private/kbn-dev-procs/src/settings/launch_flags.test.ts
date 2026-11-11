/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLaunchFlags, getFlagArgs, parseHelpFlags } from './launch_flags';
import type { FlagOverrides } from './launch_flags';

// Excerpts of `node scripts/kibana --help` and `node scripts/es snapshot --help`.
const KIBANA_HELP = `
  "serve" Options:

    -e, --elasticsearch <uri1,uri2>           Elasticsearch instances
    -p, --port <port>                         The port to bind to
    --serverless [oblt|security|es|vectordb]  Start Kibana in a specific serverless project mode
    --dev                                     Run the server with development mode defaults
    --no-base-path                            Don't put a proxy in front of the dev server
    --eis                                     Auto-discover EIS inference endpoints
    -h, --help                                output usage information
`;

const ES_HELP = `
 Options:

  --license         Run with a 'basic' or 'trial' license [default: trial]
  --password.[user] Sets password for native realm user [default: changeme]
  -E                Additional key=value settings to pass to Elasticsearch
  --kill            Kill running ES Docker containers before starting
  --eis             Enable EIS mode: sets trial license, EIS inference URL, resolves and sets CCM API key

Example:

  es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
`;

describe('parseHelpFlags', () => {
  it('reads commander options, with their placeholders', () => {
    expect(
      parseHelpFlags(KIBANA_HELP, { exclude: ['--help', '--dev'], marksSwitches: true })
    ).toEqual([
      {
        name: '--elasticsearch',
        placeholder: '<uri1,uri2>',
        arity: 'value',
        description: 'Elasticsearch instances',
      },
      { name: '--port', placeholder: '<port>', arity: 'value', description: 'The port to bind to' },
      {
        name: '--serverless',
        placeholder: '[oblt|security|es|vectordb]',
        arity: 'switch or value',
        description: 'Start Kibana in a specific serverless project mode',
      },
      {
        name: '--no-base-path',
        placeholder: undefined,
        arity: 'switch',
        description: "Don't put a proxy in front of the dev server",
      },
      {
        name: '--eis',
        placeholder: undefined,
        arity: 'switch',
        description: 'Auto-discover EIS inference endpoints',
      },
    ]);
  });

  it('reads kbn-es options, which do not say whether they take a value unless they document a default', () => {
    expect(
      parseHelpFlags(ES_HELP, { exclude: ['--help'], marksSwitches: false }).map(
        ({ name, arity }) => [name, arity]
      )
    ).toEqual([
      ['--license', 'value'],
      ['--kill', 'switch or value'],
      ['--eis', 'switch or value'],
    ]);
  });
});

describe('launch flags', () => {
  const create = (staticArgs: readonly string[] = []) => {
    const overrides: FlagOverrides = new Map();
    const flags = createLaunchFlags({
      processId: 'kibana',
      helpCommand: process.execPath,
      helpArgs: ['-e', `process.stdout.write(${JSON.stringify(KIBANA_HELP)})`],
      cwd: process.cwd(),
      staticArgs,
      staticSource: '--kibana-arg',
      exclude: ['--help', '--dev'],
      marksSwitches: true,
      overrides,
    });
    return { ...flags, overrides };
  };

  it('lists the flags from --help, marking the ones set by the user or the TUI', async () => {
    const { list, editor, overrides } = create(['--no-base-path']);
    await editor.set({ key: '--port', detail: 'value · <port> · The port to bind to' }, '5611');
    const { rows } = await list();
    expect(rows.map(({ key, value, source }) => [key, value, source])).toEqual([
      // Alphabetical, not in the order of the help.
      ['--eis', undefined, undefined],
      ['--elasticsearch', undefined, undefined],
      ['--no-base-path', 'true', '--kibana-arg'],
      ['--port', '5611', 'tui'],
      ['--serverless', undefined, undefined],
    ]);
    expect(rows[0].detail).toBe('switch · Auto-discover EIS inference endpoints');
    expect(getFlagArgs(overrides)).toEqual(['--port', '5611']);
  });

  it('switches flags on and off, and asks for a value when one is needed', async () => {
    const { editor, overrides } = create(['--no-base-path']);
    const eis = { key: '--eis', detail: 'switch · Auto-discover EIS inference endpoints' };

    await expect(editor.set(eis, 'true')).resolves.toEqual({
      message:
        'kibana starts with --eis; press r on kibana to restart it with that (this run only)',
      needsRestart: true,
    });
    expect(getFlagArgs(overrides)).toEqual(['--eis']);
    await editor.set({ ...eis, value: 'true', source: 'tui' }, 'false');
    expect(getFlagArgs(overrides)).toEqual([]);

    await expect(
      editor.set({ key: '--port', detail: 'value · <port> · The port' }, 'true')
    ).rejects.toThrow('--port takes a value; press e to enter it');
    await expect(
      editor.unset({ key: '--no-base-path', value: 'true', source: '--kibana-arg' })
    ).rejects.toThrow('--no-base-path is set by --kibana-arg, which the TUI cannot change');
    await expect(editor.unset({ key: '--eis' })).rejects.toThrow('--eis is not set');
  });
});
