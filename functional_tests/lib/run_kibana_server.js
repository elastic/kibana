import { format as formatUrl } from 'url';

import {
  PROJECT_ROOT,
  KIBANA_ROOT,
  KIBANA_EXEC,
  KIBANA_EXEC_PATH,
  OPTIMIZE_BUNDLE_DIR
} from './paths';

// TODO: we can't have saml and xpack options in OSS kibana
// but these can just be part of the config
// same with devmode, enableui, etc
export async function runKibanaServer({ procs, config, xpack = false, devMode = false, enableUI = true, useSAML = false }) {
  const xpackArgs = xpack
    ? [
      `--server.uuid=${config.get('env').kibana.server.uuid}`,
      `--plugin-path=${PROJECT_ROOT}`,
      '--xpack.monitoring.kibana.collection.enabled=false',
      '--xpack.xpack_main.telemetry.enabled=false',
    ] : [];

  const samlArgs = useSAML && xpack
    ? [
      '--server.xsrf.whitelist=[\"/api/security/v1/saml\"]',
      '--xpack.security.authProviders=[\"saml\"]',
    ]
    : [];

  // start the kibana server and wait for it to log "Server running" before resolving
  await procs.run('kibana', {
    cmd: KIBANA_EXEC,
    args: [
      KIBANA_EXEC_PATH,
      devMode ? '--dev' : '--env=development',
      '--logging.json=false',
      '--no-base-path',
      `--server.port=${config.get('servers.kibana.port')}`,
      `--optimize.enabled=${enableUI}`,
      `--optimize.watchPort=${config.get('servers.kibana.port') + 1}`,
      '--optimize.watchPrebuild=true',
      '--status.allowAnonymous=true',
      `--optimize.bundleDir=${OPTIMIZE_BUNDLE_DIR}`,
      `--elasticsearch.url=${formatUrl(config.get('servers.elasticsearch'))}`,
      `--elasticsearch.username=${config.get('servers.elasticsearch.username')}`,
      `--elasticsearch.password=${config.get('servers.elasticsearch.password')}`,
      ...xpackArgs,
      ...samlArgs,
    ],
    env: {
      FORCE_COLOR: 1,
      ...process.env,
    },
    cwd: KIBANA_ROOT,
    wait: /Server running/,
  });
}
