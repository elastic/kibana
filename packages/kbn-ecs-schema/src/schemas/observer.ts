/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable */
export const observerEcs = {
  egress: {
    dashed_name: 'observer-egress',
    description: 'Observer.egress holds information like interface number and name, vlan, and zone information to classify egress traffic.  Single armed monitoring such as a network sensor on a span port should only use observer.ingress to categorize traffic.',
    flat_name: 'observer.egress',
    level: 'extended',
    name: 'egress',
    normalize: [],
    short: 'Object field for egress information',
    type: 'object',
    interface: {
      alias: {
        dashed_name: 'observer-egress-interface-alias',
        description: 'Interface alias as reported by the system, typically used in firewall implementations for e.g. inside, outside, or dmz logical interface naming.',
        example: 'outside',
        flat_name: 'observer.egress.interface.alias',
        ignore_above: 1024,
        level: 'extended',
        name: 'alias',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface alias',
        type: 'keyword'
      },
      id: {
        dashed_name: 'observer-egress-interface-id',
        description: 'Interface ID as reported by an observer (typically SNMP interface ID).',
        example: 10,
        flat_name: 'observer.egress.interface.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface ID',
        type: 'keyword'
      },
      name: {
        dashed_name: 'observer-egress-interface-name',
        description: 'Interface name as reported by the system.',
        example: 'eth0',
        flat_name: 'observer.egress.interface.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface name',
        type: 'keyword'
      }
    },
    vlan: {
      id: {
        dashed_name: 'observer-egress-vlan-id',
        description: 'VLAN ID as reported by the observer.',
        example: 10,
        flat_name: 'observer.egress.vlan.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'vlan',
        short: 'VLAN ID as reported by the observer.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'observer-egress-vlan-name',
        description: 'Optional VLAN name as reported by the observer.',
        example: 'outside',
        flat_name: 'observer.egress.vlan.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'vlan',
        short: 'Optional VLAN name as reported by the observer.',
        type: 'keyword'
      }
    },
    zone: {
      dashed_name: 'observer-egress-zone',
      description: 'Network zone of outbound traffic as reported by the observer to categorize the destination area of egress traffic, e.g. Internal, External, DMZ, HR, Legal, etc.',
      example: 'Public_Internet',
      flat_name: 'observer.egress.zone',
      ignore_above: 1024,
      level: 'extended',
      name: 'egress.zone',
      normalize: [],
      short: 'Observer Egress zone',
      type: 'keyword'
    }
  },
  geo: {
    city_name: {
      dashed_name: 'observer-geo-city-name',
      description: 'City name.',
      example: 'Montreal',
      flat_name: 'observer.geo.city_name',
      ignore_above: 1024,
      level: 'core',
      name: 'city_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'City name.',
      type: 'keyword'
    },
    continent_code: {
      dashed_name: 'observer-geo-continent-code',
      description: "Two-letter code representing continent's name.",
      example: 'NA',
      flat_name: 'observer.geo.continent_code',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Continent code.',
      type: 'keyword'
    },
    continent_name: {
      dashed_name: 'observer-geo-continent-name',
      description: 'Name of the continent.',
      example: 'North America',
      flat_name: 'observer.geo.continent_name',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Name of the continent.',
      type: 'keyword'
    },
    country_iso_code: {
      dashed_name: 'observer-geo-country-iso-code',
      description: 'Country ISO code.',
      example: 'CA',
      flat_name: 'observer.geo.country_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'country_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country ISO code.',
      type: 'keyword'
    },
    country_name: {
      dashed_name: 'observer-geo-country-name',
      description: 'Country name.',
      example: 'Canada',
      flat_name: 'observer.geo.country_name',
      ignore_above: 1024,
      level: 'core',
      name: 'country_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country name.',
      type: 'keyword'
    },
    location: {
      dashed_name: 'observer-geo-location',
      description: 'Longitude and latitude.',
      example: '{ "lon": -73.614830, "lat": 45.505918 }',
      flat_name: 'observer.geo.location',
      level: 'core',
      name: 'location',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Longitude and latitude.',
      type: 'geo_point'
    },
    name: {
      dashed_name: 'observer-geo-name',
      description: 'User-defined description of a location, at the level of granularity they care about.\n' +
        'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
        'Not typically used in automated geolocation.',
      example: 'boston-dc',
      flat_name: 'observer.geo.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'User-defined description of a location.',
      type: 'keyword'
    },
    postal_code: {
      dashed_name: 'observer-geo-postal-code',
      description: 'Postal code associated with the location.\n' +
        'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
      example: 94040,
      flat_name: 'observer.geo.postal_code',
      ignore_above: 1024,
      level: 'core',
      name: 'postal_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Postal code.',
      type: 'keyword'
    },
    region_iso_code: {
      dashed_name: 'observer-geo-region-iso-code',
      description: 'Region ISO code.',
      example: 'CA-QC',
      flat_name: 'observer.geo.region_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'region_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region ISO code.',
      type: 'keyword'
    },
    region_name: {
      dashed_name: 'observer-geo-region-name',
      description: 'Region name.',
      example: 'Quebec',
      flat_name: 'observer.geo.region_name',
      ignore_above: 1024,
      level: 'core',
      name: 'region_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region name.',
      type: 'keyword'
    },
    timezone: {
      dashed_name: 'observer-geo-timezone',
      description: 'The time zone of the location, such as IANA time zone name.',
      example: 'America/Argentina/Buenos_Aires',
      flat_name: 'observer.geo.timezone',
      ignore_above: 1024,
      level: 'core',
      name: 'timezone',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Time zone.',
      type: 'keyword'
    }
  },
  hostname: {
    dashed_name: 'observer-hostname',
    description: 'Hostname of the observer.',
    flat_name: 'observer.hostname',
    ignore_above: 1024,
    level: 'core',
    name: 'hostname',
    normalize: [],
    short: 'Hostname of the observer.',
    type: 'keyword'
  },
  ingress: {
    dashed_name: 'observer-ingress',
    description: 'Observer.ingress holds information like interface number and name, vlan, and zone information to classify ingress traffic.  Single armed monitoring such as a network sensor on a span port should only use observer.ingress to categorize traffic.',
    flat_name: 'observer.ingress',
    level: 'extended',
    name: 'ingress',
    normalize: [],
    short: 'Object field for ingress information',
    type: 'object',
    interface: {
      alias: {
        dashed_name: 'observer-ingress-interface-alias',
        description: 'Interface alias as reported by the system, typically used in firewall implementations for e.g. inside, outside, or dmz logical interface naming.',
        example: 'outside',
        flat_name: 'observer.ingress.interface.alias',
        ignore_above: 1024,
        level: 'extended',
        name: 'alias',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface alias',
        type: 'keyword'
      },
      id: {
        dashed_name: 'observer-ingress-interface-id',
        description: 'Interface ID as reported by an observer (typically SNMP interface ID).',
        example: 10,
        flat_name: 'observer.ingress.interface.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface ID',
        type: 'keyword'
      },
      name: {
        dashed_name: 'observer-ingress-interface-name',
        description: 'Interface name as reported by the system.',
        example: 'eth0',
        flat_name: 'observer.ingress.interface.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'interface',
        short: 'Interface name',
        type: 'keyword'
      }
    },
    vlan: {
      id: {
        dashed_name: 'observer-ingress-vlan-id',
        description: 'VLAN ID as reported by the observer.',
        example: 10,
        flat_name: 'observer.ingress.vlan.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'vlan',
        short: 'VLAN ID as reported by the observer.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'observer-ingress-vlan-name',
        description: 'Optional VLAN name as reported by the observer.',
        example: 'outside',
        flat_name: 'observer.ingress.vlan.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'vlan',
        short: 'Optional VLAN name as reported by the observer.',
        type: 'keyword'
      }
    },
    zone: {
      dashed_name: 'observer-ingress-zone',
      description: 'Network zone of incoming traffic as reported by the observer to categorize the source area of ingress traffic. e.g. internal, External, DMZ, HR, Legal, etc.',
      example: 'DMZ',
      flat_name: 'observer.ingress.zone',
      ignore_above: 1024,
      level: 'extended',
      name: 'ingress.zone',
      normalize: [],
      short: 'Observer ingress zone',
      type: 'keyword'
    }
  },
  ip: {
    dashed_name: 'observer-ip',
    description: 'IP addresses of the observer.',
    flat_name: 'observer.ip',
    level: 'core',
    name: 'ip',
    normalize: [ 'array' ],
    short: 'IP addresses of the observer.',
    type: 'ip'
  },
  mac: {
    dashed_name: 'observer-mac',
    description: 'MAC addresses of the observer.\n' +
      'The notation format from RFC 7042 is suggested: Each octet (that is, 8-bit byte) is represented by two [uppercase] hexadecimal digits giving the value of the octet as an unsigned integer. Successive octets are separated by a hyphen.',
    example: '["00-00-5E-00-53-23", "00-00-5E-00-53-24"]',
    flat_name: 'observer.mac',
    ignore_above: 1024,
    level: 'core',
    name: 'mac',
    normalize: [ 'array' ],
    pattern: '^[A-F0-9]{2}(-[A-F0-9]{2}){5,}$',
    short: 'MAC addresses of the observer.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'observer-name',
    description: 'Custom name of the observer.\n' +
      'This is a name that can be given to an observer. This can be helpful for example if multiple firewalls of the same model are used in an organization.\n' +
      'If no custom name is needed, the field can be left empty.',
    example: '1_proxySG',
    flat_name: 'observer.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Custom name of the observer.',
    type: 'keyword'
  },
  os: {
    family: {
      dashed_name: 'observer-os-family',
      description: 'OS family (such as redhat, debian, freebsd, windows).',
      example: 'debian',
      flat_name: 'observer.os.family',
      ignore_above: 1024,
      level: 'extended',
      name: 'family',
      normalize: [],
      original_fieldset: 'os',
      short: 'OS family (such as redhat, debian, freebsd, windows).',
      type: 'keyword'
    },
    full: {
      dashed_name: 'observer-os-full',
      description: 'Operating system name, including the version or code name.',
      example: 'Mac OS Mojave',
      flat_name: 'observer.os.full',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'observer.os.full.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'full',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system name, including the version or code name.',
      type: 'keyword'
    },
    kernel: {
      dashed_name: 'observer-os-kernel',
      description: 'Operating system kernel version as a raw string.',
      example: '4.4.0-112-generic',
      flat_name: 'observer.os.kernel',
      ignore_above: 1024,
      level: 'extended',
      name: 'kernel',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system kernel version as a raw string.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'observer-os-name',
      description: 'Operating system name, without the version.',
      example: 'Mac OS X',
      flat_name: 'observer.os.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'observer.os.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system name, without the version.',
      type: 'keyword'
    },
    platform: {
      dashed_name: 'observer-os-platform',
      description: 'Operating system platform (such centos, ubuntu, windows).',
      example: 'darwin',
      flat_name: 'observer.os.platform',
      ignore_above: 1024,
      level: 'extended',
      name: 'platform',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system platform (such centos, ubuntu, windows).',
      type: 'keyword'
    },
    type: {
      dashed_name: 'observer-os-type',
      description: 'Use the `os.type` field to categorize the operating system into one of the broad commercial families.\n' +
        'One of these following values should be used (lowercase): linux, macos, unix, windows.\n' +
        "If the OS you're dealing with is not in the list, the field should not be populated. Please let us know by opening an issue with ECS, to propose its addition.",
      example: 'macos',
      flat_name: 'observer.os.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'type',
      normalize: [],
      original_fieldset: 'os',
      short: 'Which commercial OS family (one of: linux, macos, unix or windows).',
      type: 'keyword'
    },
    version: {
      dashed_name: 'observer-os-version',
      description: 'Operating system version as a raw string.',
      example: '10.14.1',
      flat_name: 'observer.os.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'version',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system version as a raw string.',
      type: 'keyword'
    }
  },
  product: {
    dashed_name: 'observer-product',
    description: 'The product name of the observer.',
    example: 's200',
    flat_name: 'observer.product',
    ignore_above: 1024,
    level: 'extended',
    name: 'product',
    normalize: [],
    short: 'The product name of the observer.',
    type: 'keyword'
  },
  serial_number: {
    dashed_name: 'observer-serial-number',
    description: 'Observer serial number.',
    flat_name: 'observer.serial_number',
    ignore_above: 1024,
    level: 'extended',
    name: 'serial_number',
    normalize: [],
    short: 'Observer serial number.',
    type: 'keyword'
  },
  type: {
    dashed_name: 'observer-type',
    description: 'The type of the observer the data is coming from.\n' +
      'There is no predefined list of observer types. Some examples are `forwarder`, `firewall`, `ids`, `ips`, `proxy`, `poller`, `sensor`, `APM server`.',
    example: 'firewall',
    flat_name: 'observer.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [],
    short: 'The type of the observer the data is coming from.',
    type: 'keyword'
  },
  vendor: {
    dashed_name: 'observer-vendor',
    description: 'Vendor name of the observer.',
    example: 'Symantec',
    flat_name: 'observer.vendor',
    ignore_above: 1024,
    level: 'core',
    name: 'vendor',
    normalize: [],
    short: 'Vendor name of the observer.',
    type: 'keyword'
  },
  version: {
    dashed_name: 'observer-version',
    description: 'Observer version.',
    flat_name: 'observer.version',
    ignore_above: 1024,
    level: 'core',
    name: 'version',
    normalize: [],
    short: 'Observer version.',
    type: 'keyword'
  }
}