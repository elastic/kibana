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

import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';

export function makeGeoJsonResponseHandler() {

  let lastEsResponse;
  let lastGeoJsonResponse;

  return function (vis, esResponse) {
    if (lastEsResponse === esResponse) {
      return lastGeoJsonResponse;
    }

    lastEsResponse = esResponse;

    //double conversion, first to table, then to geojson
    //This is to future-proof this code for Canvas-refactoring
    const tabifiedResponse = tabifyAggResponse(vis.getAggConfig().getResponseAggs(), esResponse, {
      asAggConfigResults: false
    });
    lastGeoJsonResponse = convertToGeoJson(tabifiedResponse);

    return lastGeoJsonResponse;
  };
}
