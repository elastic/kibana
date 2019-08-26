import del = require('del');
import childProcess = require('child_process');
import { promisify } from 'util';
import {
  INTEGRATION_TEST_DATA_PATH,
  INTEGRATION_TEST_DIR_PATH
} from './envConstants';

type Exec = typeof childProcess.exec;
const unmockedExec = childProcess.exec;
const execPromisified = promisify(unmockedExec as Exec);

export async function getBranches(cwd: string) {
  const { stdout } = await execPromisified('git --no-pager branch', { cwd });

  return stdout
    .trim()
    .split('\n')
    .map(branch => branch.trim());
}

export async function getLatestCommit({
  branch,
  commitCount,
  cwd
}: {
  branch: string;
  commitCount: number;
  cwd: string;
}) {
  const cmd = `git --no-pager log ${branch} -n ${commitCount} --format="" --unified=0 --compact-summary`;
  const { stdout } = await execPromisified(cmd, { cwd });

  return stdout;
}

// cleanup to delete previous files
export async function deleteAndSetupEnvironment() {
  await del(INTEGRATION_TEST_DATA_PATH);
  await execPromisified(`unzip mock-environment.zip`, {
    cwd: INTEGRATION_TEST_DIR_PATH
  });
}
