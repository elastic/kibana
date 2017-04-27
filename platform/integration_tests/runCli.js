import path from 'path';
import { spawnSync } from 'child_process';

const KIBANA_CLI_PATH = path.resolve(__dirname, '../../scripts/platform.js');

export default (dir, args = []) => {
  const isRelative = dir[0] !== '/';

  if (isRelative) {
    dir = path.resolve(__dirname, dir);
  }

  const result = spawnSync('node', [KIBANA_CLI_PATH, ...args], {
    cwd: dir
  });

  result.stdout = result.stdout && result.stdout.toString();
  result.stderr = result.stderr && result.stderr.toString();

  return result;
};
