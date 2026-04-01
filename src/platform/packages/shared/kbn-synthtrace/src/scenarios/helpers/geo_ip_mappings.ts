/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Real-world IP ranges mapped to geographic locations.
 * Used for generating realistic HTTP access logs with geo-location data.
 */

import { random } from './http_random';

export interface GeoLocation {
  city: string;
  country: string;
  countryCode: string;
  continent: string;
  location: {
    lat: number;
    lon: number;
  };
  timezone: string;
  ipv4Ranges: string[];
  ipv6Ranges: string[];
}

/**
 * Collection of 25 major cities worldwide with realistic IP ranges.
 * Each city includes both IPv4 and IPv6 address ranges.
 */
export const GEO_LOCATIONS: GeoLocation[] = [
  // North America
  {
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    location: { lat: 40.7128, lon: -74.006 },
    timezone: 'America/New_York',
    ipv4Ranges: ['74.6.231.0/24', '199.36.158.0/24', '64.233.160.0/24'],
    ipv6Ranges: ['2600:1700:a0::/48', '2604:a880::/32'],
  },
  {
    city: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    location: { lat: 34.0522, lon: -118.2437 },
    timezone: 'America/Los_Angeles',
    ipv4Ranges: ['104.16.0.0/16', '172.217.14.0/24'],
    ipv6Ranges: ['2607:f8b0:4007::/48', '2600:1702::/32'],
  },
  {
    city: 'Chicago',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    location: { lat: 41.8781, lon: -87.6298 },
    timezone: 'America/Chicago',
    ipv4Ranges: ['98.137.11.0/24', '209.85.200.0/24'],
    ipv6Ranges: ['2600:1703:a0::/48', '2607:f8b0:4009::/48'],
  },
  {
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    continent: 'North America',
    location: { lat: 43.6532, lon: -79.3832 },
    timezone: 'America/Toronto',
    ipv4Ranges: ['99.236.0.0/16', '192.206.151.0/24'],
    ipv6Ranges: ['2607:f8b0:400b::/48', '2620:149::/32'],
  },
  {
    city: 'Mexico City',
    country: 'Mexico',
    countryCode: 'MX',
    continent: 'North America',
    location: { lat: 19.4326, lon: -99.1332 },
    timezone: 'America/Mexico_City',
    ipv4Ranges: ['189.203.0.0/16', '201.174.0.0/16'],
    ipv6Ranges: ['2806:2f0::/32', '2806:108e::/32'],
  },

  // Europe
  {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    continent: 'Europe',
    location: { lat: 51.5074, lon: -0.1278 },
    timezone: 'Europe/London',
    ipv4Ranges: ['185.89.218.0/24', '212.58.244.0/24'],
    ipv6Ranges: ['2a00:1450:4009::/48', '2a02:c7f::/32'],
  },
  {
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    continent: 'Europe',
    location: { lat: 48.8566, lon: 2.3522 },
    timezone: 'Europe/Paris',
    ipv4Ranges: ['91.198.174.0/24', '195.154.0.0/16'],
    ipv6Ranges: ['2a00:1450:4007::/48', '2001:660::/32'],
  },
  {
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    continent: 'Europe',
    location: { lat: 52.52, lon: 13.405 },
    timezone: 'Europe/Berlin',
    ipv4Ranges: ['85.214.0.0/16', '178.63.0.0/16'],
    ipv6Ranges: ['2a00:1450:4001::/48', '2a01:4f8::/32'],
  },
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    continent: 'Europe',
    location: { lat: 52.3676, lon: 4.9041 },
    timezone: 'Europe/Amsterdam',
    ipv4Ranges: ['82.94.164.0/24', '188.40.0.0/16'],
    ipv6Ranges: ['2a00:1450:400e::/48', '2a10:50c0::/32'],
  },
  {
    city: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    continent: 'Europe',
    location: { lat: 40.4168, lon: -3.7038 },
    timezone: 'Europe/Madrid',
    ipv4Ranges: ['88.26.0.0/16', '195.235.0.0/16'],
    ipv6Ranges: ['2a00:1450:400d::/48', '2a02:9000::/32'],
  },

  // Asia
  {
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'Asia',
    location: { lat: 35.6762, lon: 139.6503 },
    timezone: 'Asia/Tokyo',
    ipv4Ranges: ['103.5.140.0/24', '210.171.224.0/24'],
    ipv6Ranges: ['2404:6800:4004::/48', '2001:df0::/32'],
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    continent: 'Asia',
    location: { lat: 1.3521, lon: 103.8198 },
    timezone: 'Asia/Singapore',
    ipv4Ranges: ['103.6.84.0/24', '202.166.0.0/16'],
    ipv6Ranges: ['2404:6800:4003::/48', '2403:5800::/32'],
  },
  {
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    continent: 'Asia',
    location: { lat: 19.076, lon: 72.8777 },
    timezone: 'Asia/Kolkata',
    ipv4Ranges: ['103.21.124.0/24', '182.73.0.0/16'],
    ipv6Ranges: ['2404:6800:4009::/48', '2405:200::/32'],
  },
  {
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    continent: 'Asia',
    location: { lat: 37.5665, lon: 126.978 },
    timezone: 'Asia/Seoul',
    ipv4Ranges: ['121.254.0.0/16', '211.234.0.0/16'],
    ipv6Ranges: ['2404:6800:4004::/48', '2001:2d8::/32'],
  },
  {
    city: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    continent: 'Asia',
    location: { lat: 31.2304, lon: 121.4737 },
    timezone: 'Asia/Shanghai',
    ipv4Ranges: ['114.114.114.0/24', '202.96.128.0/16'],
    ipv6Ranges: ['2404:6800:4008::/48', '240e::/16'],
  },

  // Australia & Oceania
  {
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'Oceania',
    location: { lat: -33.8688, lon: 151.2093 },
    timezone: 'Australia/Sydney',
    ipv4Ranges: ['103.243.0.0/16', '203.2.75.0/24'],
    ipv6Ranges: ['2404:6800:4006::/48', '2401:d800::/32'],
  },
  {
    city: 'Melbourne',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'Oceania',
    location: { lat: -37.8136, lon: 144.9631 },
    timezone: 'Australia/Melbourne',
    ipv4Ranges: ['110.232.0.0/16', '203.13.0.0/16'],
    ipv6Ranges: ['2404:6800:4007::/48', '2401:d800:10::/48'],
  },

  // South America
  {
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    continent: 'South America',
    location: { lat: -23.5505, lon: -46.6333 },
    timezone: 'America/Sao_Paulo',
    ipv4Ranges: ['177.71.128.0/20', '200.147.0.0/16'],
    ipv6Ranges: ['2800:3f0:4001::/48', '2804:14c::/32'],
  },
  {
    city: 'Buenos Aires',
    country: 'Argentina',
    countryCode: 'AR',
    continent: 'South America',
    location: { lat: -34.6037, lon: -58.3816 },
    timezone: 'America/Argentina/Buenos_Aires',
    ipv4Ranges: ['181.14.0.0/16', '200.49.0.0/16'],
    ipv6Ranges: ['2800:3f0:4002::/48', '2800:a4::/32'],
  },
  {
    city: 'Lima',
    country: 'Peru',
    countryCode: 'PE',
    continent: 'South America',
    location: { lat: -12.0464, lon: -77.0428 },
    timezone: 'America/Lima',
    ipv4Ranges: ['190.12.0.0/16', '200.48.0.0/16'],
    ipv6Ranges: ['2800:3f0:4003::/48', '2801:14::/32'],
  },

  // Africa
  {
    city: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    continent: 'Africa',
    location: { lat: -26.2041, lon: 28.0473 },
    timezone: 'Africa/Johannesburg',
    ipv4Ranges: ['41.0.0.0/16', '196.211.0.0/16'],
    ipv6Ranges: ['2c0f:fb50::/32', '2c0f:f248::/32'],
  },
  {
    city: 'Lagos',
    country: 'Nigeria',
    countryCode: 'NG',
    continent: 'Africa',
    location: { lat: 6.5244, lon: 3.3792 },
    timezone: 'Africa/Lagos',
    ipv4Ranges: ['41.58.0.0/16', '197.210.0.0/16'],
    ipv6Ranges: ['2c0f:ee00::/32', '2c0f:fce8::/32'],
  },
  {
    city: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    continent: 'Africa',
    location: { lat: 30.0444, lon: 31.2357 },
    timezone: 'Africa/Cairo',
    ipv4Ranges: ['41.32.0.0/16', '197.0.0.0/16'],
    ipv6Ranges: ['2c0f:f738::/32', '2c0f:fce0::/32'],
  },

  // Middle East
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    continent: 'Asia',
    location: { lat: 25.2048, lon: 55.2708 },
    timezone: 'Asia/Dubai',
    ipv4Ranges: ['94.200.0.0/16', '185.56.0.0/16'],
    ipv6Ranges: ['2a03:2880:f100::/48', '2a09:bac0::/32'],
  },
  {
    city: 'Tel Aviv',
    country: 'Israel',
    countryCode: 'IL',
    continent: 'Asia',
    location: { lat: 32.0853, lon: 34.7818 },
    timezone: 'Asia/Jerusalem',
    ipv4Ranges: ['84.108.0.0/16', '212.143.0.0/16'],
    ipv6Ranges: ['2a03:2880:f003::/48', '2a06:c484::/32'],
  },
];

/**
 * Get a random geo-location from the collection.
 */
export function getRandomGeoLocation(): GeoLocation {
  return GEO_LOCATIONS[Math.floor(random() * GEO_LOCATIONS.length)];
}

/**
 * Generate a random IPv4 address from a specific geo-location.
 */
export function generateIPv4FromGeo(geo: GeoLocation): string {
  const range = geo.ipv4Ranges[Math.floor(random() * geo.ipv4Ranges.length)];
  const [baseIp, cidr] = range.split('/');
  const parts = baseIp.split('.');
  const subnet = parseInt(cidr, 10);

  if (subnet >= 24) {
    parts[3] = Math.floor(random() * 256).toString();
  } else if (subnet >= 16) {
    parts[2] = Math.floor(random() * 256).toString();
    parts[3] = Math.floor(random() * 256).toString();
  } else {
    parts[1] = Math.floor(random() * 256).toString();
    parts[2] = Math.floor(random() * 256).toString();
    parts[3] = Math.floor(random() * 256).toString();
  }

  return parts.join('.');
}

/**
 * Generate a random IPv6 address from a specific geo-location.
 */
export function generateIPv6FromGeo(geo: GeoLocation): string {
  const range = geo.ipv6Ranges[Math.floor(random() * geo.ipv6Ranges.length)];
  const [baseIp] = range.split('/');

  const baseParts = baseIp.replace(/:+$/, '').split(':').filter(Boolean);

  const totalGroups = 8;
  const baseGroups = baseParts.length;
  const suffixGroups = totalGroups - baseGroups;

  const suffixParts = [];
  for (let i = 0; i < suffixGroups; i++) {
    suffixParts.push(Math.floor(random() * 65536).toString(16));
  }

  return [...baseParts, ...suffixParts].join(':');
}

/**
 * Maps cloud provider region prefixes to the continents they are closest to.
 * Used to bias client geo-locations towards the cloud region serving them,
 * so a host in `eu-west-1` primarily serves European clients.
 */
const REGION_TO_CONTINENTS: Record<string, string[]> = {
  // AWS
  'us-': ['North America'],
  'eu-': ['Europe'],
  'ap-': ['Asia', 'Oceania'],
  'sa-': ['South America'],
  'me-': ['Asia'],
  'af-': ['Africa'],
  'ca-': ['North America'],
  // GCP
  'us-central': ['North America'],
  'us-east': ['North America'],
  'us-west': ['North America'],
  'europe-': ['Europe'],
  'asia-': ['Asia', 'Oceania'],
  'southamerica-': ['South America'],
  'australia-': ['Oceania'],
  // Azure
  eastus: ['North America'],
  westus: ['North America'],
  centralus: ['North America'],
  northeurope: ['Europe'],
  westeurope: ['Europe'],
  southeastasia: ['Asia'],
  eastasia: ['Asia'],
  brazilsouth: ['South America'],
  australiaeast: ['Oceania'],
  southafricanorth: ['Africa'],
};

/**
 * Get geo-locations that are geographically close to a given cloud region.
 * Falls back to all locations if no mapping is found.
 */
function getGeoLocationsForRegion(cloudRegion: string): GeoLocation[] {
  let matchedContinents: string[] | undefined;

  for (const [prefix, continents] of Object.entries(REGION_TO_CONTINENTS)) {
    if (cloudRegion.startsWith(prefix) || cloudRegion === prefix) {
      matchedContinents = continents;
      break;
    }
  }

  if (!matchedContinents) {
    return GEO_LOCATIONS;
  }

  const nearby = GEO_LOCATIONS.filter((geo) => matchedContinents.includes(geo.continent));
  return nearby.length > 0 ? nearby : GEO_LOCATIONS;
}

/**
 * Generate a random IP address (90% IPv4, 10% IPv6) with associated geo-location data.
 */
export function generateIPWithGeo(cloudRegion?: string): {
  ip: string;
  geo: GeoLocation;
  isIPv6: boolean;
} {
  // 80% of traffic comes from the same continent as the cloud region,
  // 20% comes from anywhere (cross-region traffic is normal).
  let geo: GeoLocation;
  if (cloudRegion && random() < 0.8) {
    const nearbyLocations = getGeoLocationsForRegion(cloudRegion);
    geo = nearbyLocations[Math.floor(random() * nearbyLocations.length)];
  } else {
    geo = getRandomGeoLocation();
  }

  const isIPv6 = random() < 0.1; // 10% IPv6

  return {
    ip: isIPv6 ? generateIPv6FromGeo(geo) : generateIPv4FromGeo(geo),
    geo,
    isIPv6,
  };
}
