/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function injectVars(server) {
  const serverConfig = server.config();
  const mapConfig = serverConfig.get('map');
  const legacyWarning = (server => legacyMap =>
    server.log(
      ['warning', 'deprecated'],
      `Use of "${legacyMap}" in the kibana configuration is deprecated. ` +
        `Use "map.${legacyMap}" instead`
    ))(server);

  let tilemap = mapConfig.tilemap;
  // DEPRECATED SETTINGS
  // If neither the url nor settings have been modified, try legacy
  if (!tilemap.url && tilemap.options.default) {
    tilemap = serverConfig.get('tilemap');
    // If any of the legacy settings have been modified, issue warning
    (tilemap.url || !tilemap.options.default) && legacyWarning('tilemap');
  }
  // If url is set, old settings must be used for backward compatibility
  const isOverridden = typeof tilemap.url === 'string' && tilemap.url !== '';

  let regionmap = mapConfig.regionmap;
  //DEPRECATED SETTINGS
  // If no layers have been specified, try legacy
  if (!regionmap.layers.length) {
    regionmap = serverConfig.get('regionmap');
    regionmap.layers.length && legacyWarning('regionmap');
  }

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    regionmapsConfig: regionmap,
    mapConfig: mapConfig,
    tilemapsConfig: {
      deprecated: {
        isOverridden: isOverridden,
        config: tilemap,
      },
    },
  };
}
