/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Geo fields can carry data about a specific location related to an event.
 * This geolocation information can be derived from techniques such as Geo IP, or be user-supplied.
 */
export interface EcsGeo {
  /**
   * City name.
   */
  city_name?: string;
  /**
   * Two-letter code representing continent's name.
   */
  continent_code?: string;
  /**
   * Name of the continent.
   */
  continent_name?: string;
  /**
   * Country ISO code.
   */
  country_iso_code?: string;
  /**
   * Country name.
   */
  country_name?: string;
  /**
   * Longitude and latitude.
   */
  location?: { lat: number; lon: number };
  /**
   * User-defined description of a location, at the level of granularity they care about.
   * Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.
   * Not typically used in automated geolocation.
   */
  name?: string;
  /**
   * Postal code associated with the location.
   * Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.
   */
  postal_code?: string;
  /**
   * Region ISO code.
   */
  region_iso_code?: string;
  /**
   * Region name.
   */
  region_name?: string;
  /**
   * The time zone of the location, such as IANA time zone name.
   */
  timezone?: string;
}
