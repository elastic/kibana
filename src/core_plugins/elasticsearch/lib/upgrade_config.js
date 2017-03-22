import Promise from 'bluebird';
import isUpgradeable from './is_upgradeable';
import _ from 'lodash';

module.exports = function (server) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const config = server.config();

  function createNewConfig() {
    return callWithInternalUser('create', {
      index: config.get('kibana.index'),
      type: 'config',
      body: { buildNum: config.get('pkg.buildNum') },
      id: config.get('pkg.version')
    });
  }

  return function (response) {
    // Check to see if there are any doc. If not then we set the build number and id
    if (response.hits.hits.length === 0) {
      return createNewConfig();
    }

    // if we already have a the current version in the index then we need to stop
    const devConfig = _.find(response.hits.hits, function currentVersion(hit) {
      return hit._id !== '@@version' && hit._id === config.get('pkg.version');
    });

    if (devConfig) {
      return Promise.resolve();
    }

    // Look for upgradeable configs. If none of them are upgradeable
    // then create a new one.
    const body = _.find(response.hits.hits, isUpgradeable.bind(null, server));
    if (!body) {
      return createNewConfig();
    }

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    body._source.buildNum = config.get('pkg.buildNum');

    server.log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: body._id,
      newVersion: config.get('pkg.version')
    });

    return callWithInternalUser('create', {
      index: config.get('kibana.index'),
      type: 'config',
      body: body._source,
      id: config.get('pkg.version')
    });
  };
};
