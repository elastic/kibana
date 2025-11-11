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
    ipv4Ranges: ['192.168.1.0/24', '10.0.1.0/24', '172.16.1.0/24'],
    ipv6Ranges: ['2001:db8:1::/48', '2600:1700::/32'],
  },
  {
    city: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    location: { lat: 34.0522, lon: -118.2437 },
    timezone: 'America/Los_Angeles',
    ipv4Ranges: ['192.168.2.0/24', '10.0.2.0/24'],
    ipv6Ranges: ['2001:db8:2::/48', '2600:1702::/32'],
  },
  {
    city: 'Chicago',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    location: { lat: 41.8781, lon: -87.6298 },
    timezone: 'America/Chicago',
    ipv4Ranges: ['192.168.3.0/24', '10.0.3.0/24'],
    ipv6Ranges: ['2001:db8:3::/48', '2600:1703::/32'],
  },
  {
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    continent: 'North America',
    location: { lat: 43.6532, lon: -79.3832 },
    timezone: 'America/Toronto',
    ipv4Ranges: ['192.168.4.0/24', '10.0.4.0/24'],
    ipv6Ranges: ['2001:db8:4::/48', '2607:f8b0::/32'],
  },
  {
    city: 'Mexico City',
    country: 'Mexico',
    countryCode: 'MX',
    continent: 'North America',
    location: { lat: 19.4326, lon: -99.1332 },
    timezone: 'America/Mexico_City',
    ipv4Ranges: ['192.168.5.0/24', '10.0.5.0/24'],
    ipv6Ranges: ['2001:db8:5::/48', '2806::/32'],
  },

  // Europe
  {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    continent: 'Europe',
    location: { lat: 51.5074, lon: -0.1278 },
    timezone: 'Europe/London',
    ipv4Ranges: ['192.168.10.0/24', '10.0.10.0/24'],
    ipv6Ranges: ['2001:db8:10::/48', '2a00:1450::/32'],
  },
  {
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    continent: 'Europe',
    location: { lat: 48.8566, lon: 2.3522 },
    timezone: 'Europe/Paris',
    ipv4Ranges: ['192.168.11.0/24', '10.0.11.0/24'],
    ipv6Ranges: ['2001:db8:11::/48', '2a00:1450:4007::/48'],
  },
  {
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    continent: 'Europe',
    location: { lat: 52.52, lon: 13.405 },
    timezone: 'Europe/Berlin',
    ipv4Ranges: ['192.168.12.0/24', '10.0.12.0/24'],
    ipv6Ranges: ['2001:db8:12::/48', '2a00:1450:4001::/48'],
  },
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    continent: 'Europe',
    location: { lat: 52.3676, lon: 4.9041 },
    timezone: 'Europe/Amsterdam',
    ipv4Ranges: ['192.168.13.0/24', '10.0.13.0/24'],
    ipv6Ranges: ['2001:db8:13::/48', '2a00:1450:400e::/48'],
  },
  {
    city: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    continent: 'Europe',
    location: { lat: 40.4168, lon: -3.7038 },
    timezone: 'Europe/Madrid',
    ipv4Ranges: ['192.168.14.0/24', '10.0.14.0/24'],
    ipv6Ranges: ['2001:db8:14::/48', '2a00:1450:400d::/48'],
  },

  // Asia
  {
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'Asia',
    location: { lat: 35.6762, lon: 139.6503 },
    timezone: 'Asia/Tokyo',
    ipv4Ranges: ['192.168.20.0/24', '10.0.20.0/24'],
    ipv6Ranges: ['2001:db8:20::/48', '2404:6800::/32'],
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    continent: 'Asia',
    location: { lat: 1.3521, lon: 103.8198 },
    timezone: 'Asia/Singapore',
    ipv4Ranges: ['192.168.21.0/24', '10.0.21.0/24'],
    ipv6Ranges: ['2001:db8:21::/48', '2404:6800:4003::/48'],
  },
  {
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    continent: 'Asia',
    location: { lat: 19.076, lon: 72.8777 },
    timezone: 'Asia/Kolkata',
    ipv4Ranges: ['192.168.22.0/24', '10.0.22.0/24'],
    ipv6Ranges: ['2001:db8:22::/48', '2404:6800:4009::/48'],
  },
  {
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    continent: 'Asia',
    location: { lat: 37.5665, lon: 126.978 },
    timezone: 'Asia/Seoul',
    ipv4Ranges: ['192.168.23.0/24', '10.0.23.0/24'],
    ipv6Ranges: ['2001:db8:23::/48', '2404:6800:4004::/48'],
  },
  {
    city: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    continent: 'Asia',
    location: { lat: 31.2304, lon: 121.4737 },
    timezone: 'Asia/Shanghai',
    ipv4Ranges: ['192.168.24.0/24', '10.0.24.0/24'],
    ipv6Ranges: ['2001:db8:24::/48', '2404:6800:4008::/48'],
  },

  // Australia & Oceania
  {
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'Oceania',
    location: { lat: -33.8688, lon: 151.2093 },
    timezone: 'Australia/Sydney',
    ipv4Ranges: ['192.168.30.0/24', '10.0.30.0/24'],
    ipv6Ranges: ['2001:db8:30::/48', '2404:6800:4006::/48'],
  },
  {
    city: 'Melbourne',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'Oceania',
    location: { lat: -37.8136, lon: 144.9631 },
    timezone: 'Australia/Melbourne',
    ipv4Ranges: ['192.168.31.0/24', '10.0.31.0/24'],
    ipv6Ranges: ['2001:db8:31::/48', '2404:6800:4007::/48'],
  },

  // South America
  {
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    continent: 'South America',
    location: { lat: -23.5505, lon: -46.6333 },
    timezone: 'America/Sao_Paulo',
    ipv4Ranges: ['192.168.40.0/24', '10.0.40.0/24'],
    ipv6Ranges: ['2001:db8:40::/48', '2800:3f0::/32'],
  },
  {
    city: 'Buenos Aires',
    country: 'Argentina',
    countryCode: 'AR',
    continent: 'South America',
    location: { lat: -34.6037, lon: -58.3816 },
    timezone: 'America/Argentina/Buenos_Aires',
    ipv4Ranges: ['192.168.41.0/24', '10.0.41.0/24'],
    ipv6Ranges: ['2001:db8:41::/48', '2800:3f0:4001::/48'],
  },
  {
    city: 'Lima',
    country: 'Peru',
    countryCode: 'PE',
    continent: 'South America',
    location: { lat: -12.0464, lon: -77.0428 },
    timezone: 'America/Lima',
    ipv4Ranges: ['192.168.42.0/24', '10.0.42.0/24'],
    ipv6Ranges: ['2001:db8:42::/48', '2800:3f0:4002::/48'],
  },

  // Africa
  {
    city: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    continent: 'Africa',
    location: { lat: -26.2041, lon: 28.0473 },
    timezone: 'Africa/Johannesburg',
    ipv4Ranges: ['192.168.50.0/24', '10.0.50.0/24'],
    ipv6Ranges: ['2001:db8:50::/48', '2c0f:fb50::/32'],
  },
  {
    city: 'Lagos',
    country: 'Nigeria',
    countryCode: 'NG',
    continent: 'Africa',
    location: { lat: 6.5244, lon: 3.3792 },
    timezone: 'Africa/Lagos',
    ipv4Ranges: ['192.168.51.0/24', '10.0.51.0/24'],
    ipv6Ranges: ['2001:db8:51::/48', '2c0f:ee00::/32'],
  },
  {
    city: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    continent: 'Africa',
    location: { lat: 30.0444, lon: 31.2357 },
    timezone: 'Africa/Cairo',
    ipv4Ranges: ['192.168.52.0/24', '10.0.52.0/24'],
    ipv6Ranges: ['2001:db8:52::/48', '2c0f:f738::/32'],
  },

  // Middle East
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    continent: 'Asia',
    location: { lat: 25.2048, lon: 55.2708 },
    timezone: 'Asia/Dubai',
    ipv4Ranges: ['192.168.60.0/24', '10.0.60.0/24'],
    ipv6Ranges: ['2001:db8:60::/48', '2a03:2880::/32'],
  },
  {
    city: 'Tel Aviv',
    country: 'Israel',
    countryCode: 'IL',
    continent: 'Asia',
    location: { lat: 32.0853, lon: 34.7818 },
    timezone: 'Asia/Jerusalem',
    ipv4Ranges: ['192.168.61.0/24', '10.0.61.0/24'],
    ipv6Ranges: ['2001:db8:61::/48', '2a03:2880:f003::/48'],
  },
];

/**
 * Get a random geo-location from the collection.
 */
export function getRandomGeoLocation(): GeoLocation {
  return GEO_LOCATIONS[Math.floor(Math.random() * GEO_LOCATIONS.length)];
}

/**
 * Generate a random IPv4 address from a specific geo-location.
 */
export function generateIPv4FromGeo(geo: GeoLocation): string {
  const range = geo.ipv4Ranges[Math.floor(Math.random() * geo.ipv4Ranges.length)];
  const [baseIp, cidr] = range.split('/');
  const parts = baseIp.split('.');
  const subnet = parseInt(cidr, 10);

  // For simplicity, randomize the last octet(s) based on subnet
  if (subnet >= 24) {
    // /24 or smaller - randomize last octet
    parts[3] = Math.floor(Math.random() * 256).toString();
  } else if (subnet >= 16) {
    // /16 to /23 - randomize last two octets
    parts[2] = Math.floor(Math.random() * 256).toString();
    parts[3] = Math.floor(Math.random() * 256).toString();
  } else {
    // /8 to /15 - randomize last three octets
    parts[1] = Math.floor(Math.random() * 256).toString();
    parts[2] = Math.floor(Math.random() * 256).toString();
    parts[3] = Math.floor(Math.random() * 256).toString();
  }

  return parts.join('.');
}

/**
 * Generate a random IPv6 address from a specific geo-location.
 */
export function generateIPv6FromGeo(geo: GeoLocation): string {
  const range = geo.ipv6Ranges[Math.floor(Math.random() * geo.ipv6Ranges.length)];
  const [baseIp] = range.split('/');

  // Remove trailing '::' if present and split into parts
  const baseParts = baseIp.replace(/:+$/, '').split(':').filter(Boolean);

  // Calculate how many 16-bit groups we need in total (IPv6 has 8 groups)
  const totalGroups = 8;
  const baseGroups = baseParts.length;
  const suffixGroups = totalGroups - baseGroups;

  // Generate random suffix groups
  const suffixParts = [];
  for (let i = 0; i < suffixGroups; i++) {
    suffixParts.push(Math.floor(Math.random() * 65536).toString(16));
  }

  // Combine base prefix with random suffix
  return [...baseParts, ...suffixParts].join(':');
}

/**
 * Generate a random IP address (90% IPv4, 10% IPv6) with associated geo-location data.
 */
export function generateIPWithGeo(): {
  ip: string;
  geo: GeoLocation;
  isIPv6: boolean;
} {
  const geo = getRandomGeoLocation();
  const isIPv6 = Math.random() < 0.1; // 10% IPv6

  return {
    ip: isIPv6 ? generateIPv6FromGeo(geo) : generateIPv4FromGeo(geo),
    geo,
    isIPv6,
  };
}
