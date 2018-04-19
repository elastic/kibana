import { createToolingLog } from '../tooling_log';

export const log = createToolingLog('debug');
log.pipe(process.stdout);
