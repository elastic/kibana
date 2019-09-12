import { getOptions } from './options/options';
import { runWithOptions } from './runWithOptions';
import { HandledError } from './services/HandledError';
import { initLogger } from './services/logger';

export async function runWithArgs(args: string[]) {
  const logger = initLogger();

  try {
    const options = await getOptions(args);
    return await runWithOptions(options);
  } catch (e) {
    if (e instanceof HandledError) {
      console.error(e.message);
    } else {
      console.error(e);
    }

    // wait exiting until logs have been flushed to disc
    logger.on('finish', () => {
      process.exit(1);
    });
  }
}
