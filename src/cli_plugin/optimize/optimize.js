import { cleanArtifacts } from '../install/cleanup';
import { rebuildCache } from '../install/kibana';

export default async function optimize(settings, logger) {
  try {
    logger.log('Start stand-alone plugins optimization');

    await rebuildCache(settings, logger);

    logger.log('Plugin optimization complete');
  } catch (err) {
    logger.error(`Plugin optimization was unsuccessful due to error "${err.message}"`);
    cleanArtifacts(settings);
    process.exit(70); // eslint-disable-line no-process-exit
  }
}
