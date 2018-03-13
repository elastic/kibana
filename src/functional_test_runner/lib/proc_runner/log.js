import { createToolingLog } from '@kbn/plugin-helpers';

export const log = createToolingLog('debug');
log.pipe(process.stdout);
