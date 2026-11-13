/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The resource attributes the Collector's GeoIP processor adds from `client.address`, once the
 * Elasticsearch exporter has merged `geo.location.lat` and `geo.location.lon` into `geo.location`,
 * which the OTel index templates map as a `geo_point`.
 */
export interface EdotBrowserGeoAttributes {
  'client.address': string;
  'geo.continent.code': string;
  'geo.country.iso_code': string;
  'geo.country_name': string;
  'geo.region.iso_code': string;
  'geo.region_name': string;
  'geo.city_name': string;
  'geo.timezone': string;
  'geo.location': { lat: number; lon: number };
}

export interface VisitorLocation {
  id: string;
  weight: number;
  geo: EdotBrowserGeoAttributes;
}

interface City {
  id: string;
  weight: number;
  continent: string;
  countryIso: string;
  country: string;
  regionIso: string;
  region: string;
  city: string;
  timezone: string;
  lat: number;
  lon: number;
}

// GeoIP resolves an address to its city's coordinates, so every visitor of a city shares them.
const CITIES: readonly City[] = [
  {
    id: 'newYork',
    weight: 14,
    continent: 'NA',
    countryIso: 'US',
    country: 'United States',
    regionIso: 'US-NY',
    region: 'New York',
    city: 'New York',
    timezone: 'America/New_York',
    lat: 40.7128,
    lon: -74.006,
  },
  {
    id: 'sanFrancisco',
    weight: 9,
    continent: 'NA',
    countryIso: 'US',
    country: 'United States',
    regionIso: 'US-CA',
    region: 'California',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
    lat: 37.7749,
    lon: -122.4194,
  },
  {
    id: 'chicago',
    weight: 5,
    continent: 'NA',
    countryIso: 'US',
    country: 'United States',
    regionIso: 'US-IL',
    region: 'Illinois',
    city: 'Chicago',
    timezone: 'America/Chicago',
    lat: 41.8781,
    lon: -87.6298,
  },
  {
    id: 'austin',
    weight: 3,
    continent: 'NA',
    countryIso: 'US',
    country: 'United States',
    regionIso: 'US-TX',
    region: 'Texas',
    city: 'Austin',
    timezone: 'America/Chicago',
    lat: 30.2672,
    lon: -97.7431,
  },
  {
    id: 'toronto',
    weight: 4,
    continent: 'NA',
    countryIso: 'CA',
    country: 'Canada',
    regionIso: 'CA-ON',
    region: 'Ontario',
    city: 'Toronto',
    timezone: 'America/Toronto',
    lat: 43.6532,
    lon: -79.3832,
  },
  {
    id: 'saoPaulo',
    weight: 4,
    continent: 'SA',
    countryIso: 'BR',
    country: 'Brazil',
    regionIso: 'BR-SP',
    region: 'São Paulo',
    city: 'São Paulo',
    timezone: 'America/Sao_Paulo',
    lat: -23.5505,
    lon: -46.6333,
  },
  {
    id: 'london',
    weight: 10,
    continent: 'EU',
    countryIso: 'GB',
    country: 'United Kingdom',
    regionIso: 'GB-ENG',
    region: 'England',
    city: 'London',
    timezone: 'Europe/London',
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: 'amsterdam',
    weight: 6,
    continent: 'EU',
    countryIso: 'NL',
    country: 'Netherlands',
    regionIso: 'NL-NH',
    region: 'North Holland',
    city: 'Amsterdam',
    timezone: 'Europe/Amsterdam',
    lat: 52.3676,
    lon: 4.9041,
  },
  {
    id: 'berlin',
    weight: 6,
    continent: 'EU',
    countryIso: 'DE',
    country: 'Germany',
    regionIso: 'DE-BE',
    region: 'Land Berlin',
    city: 'Berlin',
    timezone: 'Europe/Berlin',
    lat: 52.52,
    lon: 13.405,
  },
  {
    id: 'munich',
    weight: 3,
    continent: 'EU',
    countryIso: 'DE',
    country: 'Germany',
    regionIso: 'DE-BY',
    region: 'Bavaria',
    city: 'Munich',
    timezone: 'Europe/Berlin',
    lat: 48.1351,
    lon: 11.582,
  },
  {
    id: 'paris',
    weight: 5,
    continent: 'EU',
    countryIso: 'FR',
    country: 'France',
    regionIso: 'FR-IDF',
    region: 'Île-de-France',
    city: 'Paris',
    timezone: 'Europe/Paris',
    lat: 48.8566,
    lon: 2.3522,
  },
  {
    id: 'madrid',
    weight: 4,
    continent: 'EU',
    countryIso: 'ES',
    country: 'Spain',
    regionIso: 'ES-MD',
    region: 'Madrid',
    city: 'Madrid',
    timezone: 'Europe/Madrid',
    lat: 40.4168,
    lon: -3.7038,
  },
  {
    id: 'stockholm',
    weight: 2,
    continent: 'EU',
    countryIso: 'SE',
    country: 'Sweden',
    regionIso: 'SE-AB',
    region: 'Stockholm',
    city: 'Stockholm',
    timezone: 'Europe/Stockholm',
    lat: 59.3293,
    lon: 18.0686,
  },
  {
    id: 'warsaw',
    weight: 2,
    continent: 'EU',
    countryIso: 'PL',
    country: 'Poland',
    regionIso: 'PL-14',
    region: 'Mazovia',
    city: 'Warsaw',
    timezone: 'Europe/Warsaw',
    lat: 52.2297,
    lon: 21.0122,
  },
  {
    id: 'lagos',
    weight: 2,
    continent: 'AF',
    countryIso: 'NG',
    country: 'Nigeria',
    regionIso: 'NG-LA',
    region: 'Lagos',
    city: 'Lagos',
    timezone: 'Africa/Lagos',
    lat: 6.5244,
    lon: 3.3792,
  },
  {
    id: 'dubai',
    weight: 2,
    continent: 'AS',
    countryIso: 'AE',
    country: 'United Arab Emirates',
    regionIso: 'AE-DU',
    region: 'Dubai',
    city: 'Dubai',
    timezone: 'Asia/Dubai',
    lat: 25.2048,
    lon: 55.2708,
  },
  {
    id: 'bengaluru',
    weight: 5,
    continent: 'AS',
    countryIso: 'IN',
    country: 'India',
    regionIso: 'IN-KA',
    region: 'Karnataka',
    city: 'Bengaluru',
    timezone: 'Asia/Kolkata',
    lat: 12.9716,
    lon: 77.5946,
  },
  {
    id: 'singapore',
    weight: 3,
    continent: 'AS',
    countryIso: 'SG',
    country: 'Singapore',
    regionIso: 'SG-01',
    region: 'Central Singapore',
    city: 'Singapore',
    timezone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: 'tokyo',
    weight: 5,
    continent: 'AS',
    countryIso: 'JP',
    country: 'Japan',
    regionIso: 'JP-13',
    region: 'Tokyo',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: 'sydney',
    weight: 3,
    continent: 'OC',
    countryIso: 'AU',
    country: 'Australia',
    regionIso: 'AU-NSW',
    region: 'New South Wales',
    city: 'Sydney',
    timezone: 'Australia/Sydney',
    lat: -33.8688,
    lon: 151.2093,
  },
];

// Documentation address blocks (RFC 5737), which route nowhere.
const ADDRESS_BLOCKS = ['192.0.2', '198.51.100', '203.0.113'] as const;

export const VISITOR_LOCATIONS: readonly VisitorLocation[] = CITIES.map(
  (
    { id, weight, continent, countryIso, country, regionIso, region, city, timezone, lat, lon },
    index
  ) => ({
    id,
    weight,
    geo: {
      'client.address': `${ADDRESS_BLOCKS[index % ADDRESS_BLOCKS.length]}.${index + 1}`,
      'geo.continent.code': continent,
      'geo.country.iso_code': countryIso,
      'geo.country_name': country,
      'geo.region.iso_code': regionIso,
      'geo.region_name': region,
      'geo.city_name': city,
      'geo.timezone': timezone,
      'geo.location': { lat, lon },
    },
  })
);

/** Picks where a visitor browses from, by weight. */
export const pickVisitorLocation = (random: () => number = Math.random): VisitorLocation => {
  const total = VISITOR_LOCATIONS.reduce((sum, { weight }) => sum + weight, 0);
  let threshold = random() * total;
  for (const location of VISITOR_LOCATIONS) {
    threshold -= location.weight;
    if (threshold < 0) {
      return location;
    }
  }
  return VISITOR_LOCATIONS[VISITOR_LOCATIONS.length - 1];
};
