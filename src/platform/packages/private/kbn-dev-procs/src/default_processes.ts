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
}: DefaultProcessOptions): readonly ProcessDefinition[] => [
  {
    id: 'es',
    command: process.execPath,
    args: [path.join(REPO_ROOT, 'scripts', 'es'), 'snapshot', ...esArgs],
    cwd: REPO_ROOT,
    ready: {
      type: 'http',
      url: new URL('/_cluster/health?wait_for_status=yellow&timeout=1s', esUrl).href,
      auth: ES_AUTH,
    },
    settings: createEsSettingsProvider({ esUrl, auth: ES_AUTH }),
  },
  {
    id: 'kibana',
    command: process.execPath,
    args: [path.join(REPO_ROOT, 'scripts', 'kibana'), '--dev', ...kibanaArgs],
    cwd: REPO_ROOT,
    dependsOn: ['es'],
    ready: { type: 'log', pattern: /Kibana is now available/ },
    settings: createKibanaSettingsProvider({ repoRoot: REPO_ROOT, kibanaArgs, cacheDir }),
  },
];
