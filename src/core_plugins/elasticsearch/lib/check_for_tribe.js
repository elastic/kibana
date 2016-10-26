import { get } from 'lodash';

import SetupError from './setup_error';

module.exports = function checkForTribe(server, client) {
  server.log(['plugin', 'debug'], 'Ensuring that elasticsearch is not a tribe node');

  return client.nodes.info({
    nodeId: '_local',
    filterPath: 'nodes.*.settings.tribe'
  })
  .then(function (info) {
    const nodeId = Object.keys(info.nodes || {})[0];
    const tribeSettings = get(info, ['nodes', nodeId, 'settings', 'tribe']);

    if (tribeSettings) {
      throw new SetupError(server,
        'Kibana does not support using tribe nodes as the primary elasticsearch connection. '
      );
    }

    return true;
  });
};
