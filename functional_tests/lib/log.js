import { createToolingLog } from '@kbn/dev-utils';

export const log = createToolingLog('debug');
log.pipe(process.stdout);
