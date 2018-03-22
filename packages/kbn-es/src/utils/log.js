const { createToolingLog } = require('@kbn/dev-utils');

const log = createToolingLog('verbose');
log.pipe(process.stdout);

exports.log = log;
