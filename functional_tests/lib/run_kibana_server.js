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
export async function runKibanaServer({
  procs,
  config,
  xpack = false,
  useSAML = false,
}) {
  const cliArgs = config.get('kibanaServerArgs') || [];

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
      ...cliArgs,
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
