import { createToolingLog, pickLevelFromFlags } from '../tooling_log';
import { isFailError } from './fail';
import { getFlags, getHelp } from './flags';

export async function run(body) {
  const flags = getFlags(process.argv.slice(2));

  if (flags.help) {
    process.stderr.write(getHelp());
    process.exit(1);
  }

  const log = createToolingLog(pickLevelFromFlags(flags));
  log.pipe(process.stdout);

  try {
    await body({ log, flags });
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
}
