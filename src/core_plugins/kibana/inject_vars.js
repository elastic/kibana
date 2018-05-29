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
