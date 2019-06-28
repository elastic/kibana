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


import { EMSClient } from '../../../../../core_plugins/tile_map/common/ems_client';

import EMS_CATALOGUE from './ems_mocks/sample_manifest.json';
import EMS_FILES from './ems_mocks/sample_files.json';
import EMS_TILES from './ems_mocks/sample_tiles.json';
import EMS_STYLE_ROAD_MAP_BRIGHT from './ems_mocks/sample_style_bright';
import EMS_STYLE_ROAD_MAP_DESATURATED from './ems_mocks/sample_style_desaturated';
import EMS_STYLE_DARK_MAP from './ems_mocks/sample_style_dark';

export function getEMSClient(options = {}) {

  const emsClient = new EMSClient({
    language: 'en',
    kbnVersion: '7.x.x',
    manifestServiceUrl: 'https://foobar',
    htmlSanitizer: x => x,
    landingPageUrl: 'https://landing.foobar',
    ...options
  });

  emsClient.getManifest = async (url) => {
    //simulate network calls
    if (url.startsWith('https://foobar')) {
      return EMS_CATALOGUE;
    } else if (url.startsWith('https://tiles.foobar')) {
      return EMS_TILES;
    } else if (url.startsWith('https://files.foobar')) {
      return EMS_FILES;
    } else if (url.startsWith('https://raster-style.foobar')) {
      if (url.includes('osm-bright-desaturated')) {
        return EMS_STYLE_ROAD_MAP_DESATURATED;
      } else if (url.includes('osm-bright')) {
        return EMS_STYLE_ROAD_MAP_BRIGHT;
      } else if (url.includes('dark-matter')) {
        return EMS_STYLE_DARK_MAP;
      }
    }
  };
  return emsClient;
}
