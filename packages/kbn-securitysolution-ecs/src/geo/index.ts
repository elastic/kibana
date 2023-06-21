/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface GeoEcs {
  city_name?: string[];
  continent_name?: string[];
  country_iso_code?: string[];
  country_name?: string[];
  location?: Location;
  region_iso_code?: string[];
  region_name?: string[];
}

export interface Location {
  lon?: number[];
  lat?: number[];
}
