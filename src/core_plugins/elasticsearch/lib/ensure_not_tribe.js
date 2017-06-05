import { get } from 'lodash';

export function ensureNotTribe(callWithInternalUser) {
  return callWithInternalUser('nodes.info', {
    nodeId: '_local',
    filterPath: 'nodes.*.settings.tribe'
  })
  .then(function (info) {
    const nodeId = Object.keys(info.nodes || {})[0];
    const tribeSettings = get(info, ['nodes', nodeId, 'settings', 'tribe']);

    if (tribeSettings) {
      throw new Error('Kibana does not support using tribe nodes as the primary elasticsearch connection.');
    }

    return true;
  });
}
