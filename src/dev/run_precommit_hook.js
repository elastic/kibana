import { createToolingLog } from '../utils';

import {
  getFilesForCommit,
  lintFiles,
  checkFileCasing,
  isFailError,
} from './precommit_hook';

(async function main() {
  const log = createToolingLog('debug');
  log.pipe(process.stdout);

  try {
    const files = await getFilesForCommit();
    await checkFileCasing(log, files);
    await lintFiles(log, files);
  } catch (error) {
    if (isFailError(error)) {
      log.error(error.message);
      process.exit(error.exitCode);
    } else {
      log.error('UNHANDLED ERROR');
      log.error(error);
      process.exit(1);
    }
  }
}());
