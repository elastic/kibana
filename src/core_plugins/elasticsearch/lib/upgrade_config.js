import Promise from 'bluebird';
import isUpgradeable from './is_upgradeable';
import _ from 'lodash';

export default function (server, savedObjectsClient) {
  const config = server.config();

  function createNewConfig() {
    return savedObjectsClient.create('config', {
      buildNum: config.get('pkg.buildNum')
    }, {
      id: config.get('pkg.version')
    });
  }

  return function (configSavedObjects) {
    // Check to see if there are any doc. If not then we set the build number and id
    if (configSavedObjects.length === 0) {
      return createNewConfig();
    }

    // if we already have a the current version in the index then we need to stop
    const devConfig = _.find(configSavedObjects, function currentVersion(configSavedObject) {
      return configSavedObject.id !== '@@version' && configSavedObject.id === config.get('pkg.version');
    });

    if (devConfig) {
      return Promise.resolve();
    }

    // Look for upgradeable configs. If none of them are upgradeable
    // then create a new one.
    const configSavedObject = _.find(configSavedObjects, isUpgradeable.bind(null, server));
    if (!configSavedObject) {
      return createNewConfig();
    }

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    configSavedObject.attributes.buildNum = config.get('pkg.buildNum');

    server.log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: configSavedObject.id,
      newVersion: config.get('pkg.version')
    });

    return savedObjectsClient.create('config', configSavedObject.attributes, {
      id: config.get('pkg.version')
    });
  };
}
