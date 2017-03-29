export function injectVars(server) {
  const serverConfig = server.config();

  //DEPRECATED SETTINGS
  //if the url is set, the old settings must be used.
  //keeping this logic for backward compatibilty.
  const configuredUrl = server.config().get('tilemap.url');
  const isOverridden = typeof configuredUrl === 'string' && configuredUrl !== '';
  const tilemapConfig = serverConfig.get('tilemap');
  const vectormapsConfig = (serverConfig.get('vectormap')) ? serverConfig.get('vectormap') : { layers: [] };

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    vectormapsConfig: vectormapsConfig,
    tilemapsConfig: {
      deprecated: {
        isOverridden: isOverridden,
        config: tilemapConfig,
      },
      manifestServiceUrl: serverConfig.get('tilemap.manifestServiceUrl')
    }
  };
}
