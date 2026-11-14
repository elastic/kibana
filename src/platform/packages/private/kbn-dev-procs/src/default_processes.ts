/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createEsSettingsProvider } from './settings/es_settings';
import { createKibanaSettingsProvider } from './settings/kibana_settings';
import { createLaunchFlags, getFlagArgs } from './settings/launch_flags';
import type { FlagOverrides } from './settings/launch_flags';
import type { ProcessDefinition } from './types';

export interface DefaultProcessOptions {
  readonly esArgs?: readonly string[];
  readonly kibanaArgs?: readonly string[];
  /** Where Elasticsearch answers once started, used for its readiness check. */
  readonly esUrl?: string;
  /** Where to cache data that is slow to compute, like the list of every Kibana setting. */
  readonly cacheDir: string;
}

const DEFAULT_ES_URL = 'http://localhost:9200';
const ES_AUTH = { username: 'elastic', password: 'changeme' } as const;

/** Elasticsearch from a snapshot, and Kibana in dev mode once Elasticsearch is ready. */
export const getDefaultProcesses = ({
  esArgs = [],
  kibanaArgs = [],
  esUrl = DEFAULT_ES_URL,
  cacheDir,
}: DefaultProcessOptions): readonly ProcessDefinition[] => {
  // Settings changed in the TUI; Elasticsearch gets them as -E flags whenever it (re)starts.
  const esOverrides = new Map<string, string>();
  // Command-line flags set in the TUI, passed whenever the process (re)starts.
  const esFlagOverrides: FlagOverrides = new Map();
  const kibanaFlagOverrides: FlagOverrides = new Map();
  const esScript = [path.join(REPO_ROOT, 'scripts', 'es'), 'snapshot'];
  const kibanaScript = [path.join(REPO_ROOT, 'scripts', 'kibana'), '--dev'];
  const esFlags = createLaunchFlags({
    processId: 'es',
    helpCommand: process.execPath,
    helpArgs: [...esScript, '--help'],
    cwd: REPO_ROOT,
    staticArgs: esArgs,
    staticSource: '--es-arg',
    exclude: ['--help'],
    marksSwitches: false,
    overrides: esFlagOverrides,
  });
  const kibanaFlags = createLaunchFlags({
    processId: 'kibana',
    helpCommand: process.execPath,
    helpArgs: [path.join(REPO_ROOT, 'scripts', 'kibana'), '--help'],
    cwd: REPO_ROOT,
    staticArgs: kibanaArgs,
    staticSource: '--kibana-arg',
    exclude: ['--help', '--dev'],
    marksSwitches: true,
    overrides: kibanaFlagOverrides,
  });
  return [
    {
      id: 'es',
      command: process.execPath,
      args: () => [
        ...esScript,
        ...esArgs,
        ...getFlagArgs(esFlagOverrides),
        ...[...esOverrides].flatMap(([key, value]) => ['-E', `${key}=${value}`]),
      ],
      cwd: REPO_ROOT,
      url: esUrl,
      ready: {
        type: 'http',
        url: new URL('/_cluster/health?wait_for_status=yellow&timeout=1s', esUrl).href,
        auth: ES_AUTH,
      },
      settings: {
        ...createEsSettingsProvider({ esUrl, auth: ES_AUTH, overrides: esOverrides }),
        flags: esFlags.list,
        flagEditor: esFlags.editor,
      },
    },
    {
      id: 'kibana',
      command: process.execPath,
      args: () => [...kibanaScript, ...kibanaArgs, ...getFlagArgs(kibanaFlagOverrides)],
      cwd: REPO_ROOT,
      dependsOn: ['es'],
      ready: { type: 'log', pattern: /Kibana is now available/ },
      // In dev mode, Kibana is behind a proxy that adds a random base path; that is the URL to open.
      urlPatterns: [/basepath proxy server running at (\S+)/, /http server running at (\S+)/],
      settings: {
        ...createKibanaSettingsProvider({ repoRoot: REPO_ROOT, kibanaArgs, cacheDir }),
        flags: kibanaFlags.list,
        flagEditor: kibanaFlags.editor,
      },
    },
  ];
};
