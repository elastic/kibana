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
  const conflictingConfigsError = (server => legacyMap => {
    server.log(
      ['error', 'init'],
      `Both legacy "${legacyMap}" and current "map.${legacyMap}" configurations ` +
      `detected. Please use only current map configurations: "map.${legacyMap}".`
    );
    throw new Error(`Competing legacy and current ${legacyMap} ` +
      `map configurations detected`);
  })(server);

  let regionmap = mapConfig.regionmap;
  let tilemap = mapConfig.tilemap;
  const legacyTilemap = serverConfig.get('tilemap');
  const legacyRegionmap = serverConfig.get('regionmap');

  // DEPRECATED SETTINGS
  // For both tile & region maps:
  // If no layers have been specified, try legacy. If both modified, throw error
  if (!tilemap.url || tilemap.options.default) {
    (legacyTilemap.url || !legacyTilemap.options.default)
      && (tilemap = legacyTilemap)
      && legacyWarning('tilemap');
  } else {
    (legacyTilemap.url || !legacyTilemap.options.default)
      && conflictingConfigsError('tilemap');
  }
  if (!regionmap.layers.length) {
    legacyRegionmap.layers.length
      && (regionmap = legacyRegionmap)
      && legacyWarning('regionmap');
  } else {
    legacyRegionmap.layers.length
      && conflictingConfigsError('regionmap');
  }

  // If url is set, old settings must be used for backward compatibility
  const isOverridden = typeof tilemap.url === 'string' && tilemap.url !== '';

  return {
    kbnDefaultAppId: serverConfig.get('kibana.defaultAppId'),
    disableWelcomeScreen: serverConfig.get('kibana.disableWelcomeScreen'),
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
