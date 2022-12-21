/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-geo.html
 *
 * @internal
 */
export interface EcsGeo {
  city_name?: string;
  continent_code?: string;
  continent_name?: string;
  country_iso_code?: string;
  country_name?: string;
  location?: GeoPoint;
  name?: string;
  postal_code?: string;
  region_iso_code?: string;
  region_name?: string;
  timezone?: string;
}

interface GeoPoint {
  lat: number;
  lon: number;
}
