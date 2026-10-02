/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

// The plugin is disabled by default (xpack.nightshift_investigations.enabled),
// so its tests run against a config set that turns it on. Semantic Memory is a
// separate flag that also defaults to false, and the Memory browsing page is
// silently absent without it, so it is turned on here rather than in each suite.
//
// Semantic Memory owns a plain, non-`ai-index-idx-` index and reaches it through
// the internal Elasticsearch client. Scout's default Kibana user is
// `kibana_system`, a reserved ES role that cannot create or read an index the
// setup did not pre-create for it, so the plugin cannot even create its own index
// on boot. The default set points Kibana at `kibana_system`; this set points it at
// `system_indices_superuser`, the file-backed role Scout's own `roles.yml` already
// defines with `all` on every index. It is not `elastic`, which Kibana refuses to
// run as, and it is the same user the local `:5601` stack uses. Scoped to this
// config set, so the default and every other suite keep `kibana_system`.
const ELASTICSEARCH_USERNAME = 'system_indices_superuser';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  servers: {
    ...defaultConfig.servers,
    elasticsearch: {
      ...defaultConfig.servers.elasticsearch,
      username: ELASTICSEARCH_USERNAME,
    },
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      // `serverArgs` is built from the default set's username at module load, so
      // overriding `servers` above does not reach it. The default's two args are
      // replaced rather than shadowed by a duplicate, so the effective value is
      // readable from the arguments themselves.
      ...defaultConfig.kbnTestServer.serverArgs.filter(
        (arg) =>
          !arg.startsWith('--elasticsearch.username=') &&
          !arg.startsWith('--elasticsearch.password=')
      ),
      `--elasticsearch.username=${ELASTICSEARCH_USERNAME}`,
      `--elasticsearch.password=${defaultConfig.servers.elasticsearch.password}`,
      '--xpack.nightshift_investigations.enabled=true',
      '--xpack.nightshift_investigations.memory.enabled=true',
    ],
  },
};
