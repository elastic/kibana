import _ from 'lodash';

export function injectVars(server) {
  const serverConfig = server.config();

  //DEPRECATED SETTINGS
  //if the url is set, the old settings must be used.
  //keeping this logic for backward compatibilty.
  const configuredUrl = server.config().get('tilemap.url');
  const isOverridden = typeof configuredUrl === 'string' && configuredUrl !== '';
  const tilemapConfig = _.cloneDeep(serverConfig.get('tilemap'));
  const vectormapsConfig = _.cloneDeep(serverConfig.get('regionmap'));
  const mapConfig = _.cloneDeep(serverConfig.get('map'));


  vectormapsConfig.layers =  (vectormapsConfig.layers) ? vectormapsConfig.layers : [];

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    vectormapsConfig: vectormapsConfig,
    mapConfig: mapConfig,
    tilemapsConfig: {
      deprecated: {
        isOverridden: isOverridden,
        config: tilemapConfig,
      },
      manifestServiceUrl: serverConfig.get('tilemap.manifestServiceUrl')
    }
  };
}
