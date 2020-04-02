import child_process from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

export async function exec(cmd: string, options: child_process.ExecOptions) {
  logger.info(`exec cmd: ${cmd}`);
  const execPromisified = promisify(child_process.exec);
  const res = await execPromisified(cmd, {
    maxBuffer: 100 * 1024 * 1024,
    ...options,
  });
  logger.verbose(`exec result`, res);
  return res;
}

export const execAsCallback = (
  ...args: Parameters<typeof child_process.exec>
) => {
  return child_process.exec(...args);
};
