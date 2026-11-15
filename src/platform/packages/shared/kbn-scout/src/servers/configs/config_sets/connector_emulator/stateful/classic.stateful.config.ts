/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

// Where `node scripts/connector_emulate` listens and keeps its CA, which it also asks for.
const { proxyUrl, caCertFile } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });

/**
 * Stateful Kibana and Elasticsearch defaults, with Kibana's connector requests going through the
 * connector emulator (`node scripts/connector_emulate --all`), which has to be running, and to have
 * created its CA, before the servers start: `xpack.actions.proxyUrl` points at it, and
 * `NODE_EXTRA_CA_CERTS` makes Kibana trust that CA for every vendor host, including those that come
 * from a connector's config. Both can only be set at boot, which is why this set exists.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    env: { ...defaultConfig.kbnTestServer.env, NODE_EXTRA_CA_CERTS: caCertFile },
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, `--xpack.actions.proxyUrl=${proxyUrl}`],
  },
};
