import {
  KIBANA_ROOT,
  KIBANA_EXEC,
  KIBANA_EXEC_PATH,
} from './paths';

export async function runKibanaServer({ procs, config }) {
  const cliArgs = config.get('kibanaServerArgs') || [];

  // start the kibana server and wait for it to log "Server running" before resolving
  await procs.run('kibana', {
    cmd: KIBANA_EXEC,
    args: [
      KIBANA_EXEC_PATH,
      ...cliArgs,
    ],
    env: {
      FORCE_COLOR: 1,
      ...process.env,
    },
    cwd: KIBANA_ROOT,
    wait: /Server running/,
  });
}
