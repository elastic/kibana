import child_process from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

export async function exec(cmd: string, options: child_process.ExecOptions) {
  const execPromisified = promisify(child_process.exec);
  try {
    const res = await execPromisified(cmd, {
      maxBuffer: 100 * 1024 * 1024,
      ...options,
    });
    logger.verbose(`exec success '${cmd}':`, res);
    return res;
  } catch (e) {
    logger.info(`exec error '${cmd}': ${JSON.stringify(e, null, 2)}`);
    throw e;
  }
}

export const execAsCallback = (
  ...args: Parameters<typeof child_process.exec>
) => {
  return child_process.exec(...args);
};
