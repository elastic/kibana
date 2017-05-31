export function injectVars(server) {
  const serverConfig = server.config();

  //DEPRECATED SETTINGS
  //if the url is set, the old settings must be used.
  //keeping this logic for backward compatibilty.
  const configuredUrl = server.config().get('tilemap.url');
  const isOverridden = typeof configuredUrl === 'string' && configuredUrl !== '';
  const tilemapConfig = serverConfig.get('tilemap');
  const regionmapsConfig = serverConfig.get('regionmap');
  const mapConfig = serverConfig.get('map');


  regionmapsConfig.layers =  (regionmapsConfig.layers) ? regionmapsConfig.layers : [];

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    regionmapsConfig: regionmapsConfig,
    mapConfig: mapConfig,
    tilemapsConfig: {
      deprecated: {
        isOverridden: isOverridden,
        config: tilemapConfig,
      }
    }
  };
}
