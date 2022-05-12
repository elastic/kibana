export const geoEcs = {
  city_name: {
    dashed_name: 'geo-city-name',
    description: 'City name.',
    example: 'Montreal',
    flat_name: 'geo.city_name',
    ignore_above: 1024,
    level: 'core',
    name: 'city_name',
    normalize: [],
    short: 'City name.',
    type: 'keyword'
  },
  continent_code: {
    dashed_name: 'geo-continent-code',
    description: "Two-letter code representing continent's name.",
    example: 'NA',
    flat_name: 'geo.continent_code',
    ignore_above: 1024,
    level: 'core',
    name: 'continent_code',
    normalize: [],
    short: 'Continent code.',
    type: 'keyword'
  },
  continent_name: {
    dashed_name: 'geo-continent-name',
    description: 'Name of the continent.',
    example: 'North America',
    flat_name: 'geo.continent_name',
    ignore_above: 1024,
    level: 'core',
    name: 'continent_name',
    normalize: [],
    short: 'Name of the continent.',
    type: 'keyword'
  },
  country_iso_code: {
    dashed_name: 'geo-country-iso-code',
    description: 'Country ISO code.',
    example: 'CA',
    flat_name: 'geo.country_iso_code',
    ignore_above: 1024,
    level: 'core',
    name: 'country_iso_code',
    normalize: [],
    short: 'Country ISO code.',
    type: 'keyword'
  },
  country_name: {
    dashed_name: 'geo-country-name',
    description: 'Country name.',
    example: 'Canada',
    flat_name: 'geo.country_name',
    ignore_above: 1024,
    level: 'core',
    name: 'country_name',
    normalize: [],
    short: 'Country name.',
    type: 'keyword'
  },
  location: {
    dashed_name: 'geo-location',
    description: 'Longitude and latitude.',
    example: '{ "lon": -73.614830, "lat": 45.505918 }',
    flat_name: 'geo.location',
    level: 'core',
    name: 'location',
    normalize: [],
    short: 'Longitude and latitude.',
    type: 'geo_point'
  },
  name: {
    dashed_name: 'geo-name',
    description: 'User-defined description of a location, at the level of granularity they care about.\n' +
      'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
      'Not typically used in automated geolocation.',
    example: 'boston-dc',
    flat_name: 'geo.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'User-defined description of a location.',
    type: 'keyword'
  },
  postal_code: {
    dashed_name: 'geo-postal-code',
    description: 'Postal code associated with the location.\n' +
      'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
    example: 94040,
    flat_name: 'geo.postal_code',
    ignore_above: 1024,
    level: 'core',
    name: 'postal_code',
    normalize: [],
    short: 'Postal code.',
    type: 'keyword'
  },
  region_iso_code: {
    dashed_name: 'geo-region-iso-code',
    description: 'Region ISO code.',
    example: 'CA-QC',
    flat_name: 'geo.region_iso_code',
    ignore_above: 1024,
    level: 'core',
    name: 'region_iso_code',
    normalize: [],
    short: 'Region ISO code.',
    type: 'keyword'
  },
  region_name: {
    dashed_name: 'geo-region-name',
    description: 'Region name.',
    example: 'Quebec',
    flat_name: 'geo.region_name',
    ignore_above: 1024,
    level: 'core',
    name: 'region_name',
    normalize: [],
    short: 'Region name.',
    type: 'keyword'
  },
  timezone: {
    dashed_name: 'geo-timezone',
    description: 'The time zone of the location, such as IANA time zone name.',
    example: 'America/Argentina/Buenos_Aires',
    flat_name: 'geo.timezone',
    ignore_above: 1024,
    level: 'core',
    name: 'timezone',
    normalize: [],
    short: 'Time zone.',
    type: 'keyword'
  }
}