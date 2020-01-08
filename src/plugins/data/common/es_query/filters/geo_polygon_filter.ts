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

import { Filter, FilterMeta, LatLon } from './meta_filter';

export type GeoPolygonFilterMeta = FilterMeta & {
  params: {
    points: LatLon[];
  };
};

export type GeoPolygonFilter = Filter & {
  meta: GeoPolygonFilterMeta;
  geo_polygon: any;
};

export const isGeoPolygonFilter = (filter: any): filter is GeoPolygonFilter =>
  filter && filter.geo_polygon;

export const getGeoPolygonFilterField = (filter: GeoPolygonFilter) => {
  return (
    filter.geo_polygon && Object.keys(filter.geo_polygon).find(key => key !== 'ignore_unmapped')
  );
};
