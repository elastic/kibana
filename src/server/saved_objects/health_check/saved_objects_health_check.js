import {
  ensureIndexIsReady,
  ensureConfigExists,
} from './lib';

import { patchIndex } from '../mappings';

export async function savedObjectsHealthCheck(kbnServer, status) {
  const { server, config, savedObjectMappings } = kbnServer;
  const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const index = config.get('kibana.index');
  const log = (...args) => server.log(...args);

  // checks for kibana index and waits for it to be online and ready
  await ensureIndexIsReady({
    status,
    callCluster,
    index,
    checkDelay: config.get('elasticsearch.healthCheck.delay'),
    mappingsDsl: savedObjectMappings.getDsl(),
  });

  // ensures that the kibana index has the mappings that it should
  await patchIndex({
    log,
    index,
    callCluster,
    mappings: savedObjectMappings
  });

  // ensures that the kibana index has the config doc it needs
  await ensureConfigExists({
    log,
    version: config.get('pkg.version'),
    buildNum: config.get('pkg.buildNum'),
    savedObjectsClient: server.savedObjectsClientFactory({
      callCluster
    })
  });
}
