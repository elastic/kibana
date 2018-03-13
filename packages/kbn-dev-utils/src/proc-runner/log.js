import { createToolingLog } from '../tooling-log';

export const log = createToolingLog('debug');
log.pipe(process.stdout);
