import { delay } from 'bluebird';

import { HEALTH, getIndexHealth } from './get_index_health';
import { createIndex } from './create_index';

export async function ensureIndexIsReady(options) {
  const {
    callCluster,
    index,
    checkDelay,
    status,
    mappingsDsl,
  } = options;

  // get the health of the index
  const health = await getIndexHealth({
    callCluster,
    index
  });

  // if the index is health then our work is done
  if (health === HEALTH.READY) {
    return;
  }

  // if there is not index then we use createIndex(), which
  // ensures the index is ready before resolving
  if (health === HEALTH.NO_INDEX) {
    status.yellow('No existing Kibana index found');
    await createIndex({
      callCluster,
      index,
      mappingsDsl
    });
    return;
  }

  // if something outside of kibana, or another kibana node, created the kibana
  // index then we might discover a kibana index that is still initializing so we
  // hang out for `checkDelay` and then recursively try again.
  if (health === HEALTH.INITIALIZING) {
    status.red('Elasticsearch is still initializing the kibana index.');
    await delay(checkDelay);
    return await ensureIndexIsReady(options);
  }

  throw new Error(`Unexpected index health ${health}`);
}
