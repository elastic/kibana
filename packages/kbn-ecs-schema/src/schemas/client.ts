export const clientEcs = {
  address: {
    dashed_name: 'client-address',
    description: 'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field.\n' +
      'Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
    flat_name: 'client.address',
    ignore_above: 1024,
    level: 'extended',
    name: 'address',
    normalize: [],
    short: 'Client network address.',
    type: 'keyword'
  },
  as: {
    number: {
      dashed_name: 'client-as-number',
      description: 'Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.',
      example: 15169,
      flat_name: 'client.as.number',
      level: 'extended',
      name: 'number',
      normalize: [],
      original_fieldset: 'as',
      short: 'Unique number allocated to the autonomous system.',
      type: 'long'
    },
    organization: {
      name: {
        dashed_name: 'client-as-organization-name',
        description: 'Organization name.',
        example: 'Google LLC',
        flat_name: 'client.as.organization.name',
        ignore_above: 1024,
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'client.as.organization.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'organization.name',
        normalize: [],
        original_fieldset: 'as',
        short: 'Organization name.',
        type: 'keyword'
      }
    }
  },
  bytes: {
    dashed_name: 'client-bytes',
    description: 'Bytes sent from the client to the server.',
    example: 184,
    flat_name: 'client.bytes',
    format: 'bytes',
    level: 'core',
    name: 'bytes',
    normalize: [],
    short: 'Bytes sent from the client to the server.',
    type: 'long'
  },
  domain: {
    dashed_name: 'client-domain',
    description: 'The domain name of the client system.\n' +
      'This value may be a host name, a fully qualified domain name, or another host naming format. The value may derive from the original event or be added from enrichment.',
    example: 'foo.example.com',
    flat_name: 'client.domain',
    ignore_above: 1024,
    level: 'core',
    name: 'domain',
    normalize: [],
    short: 'The domain name of the client.',
    type: 'keyword'
  },
  geo: {
    city_name: {
      dashed_name: 'client-geo-city-name',
      description: 'City name.',
      example: 'Montreal',
      flat_name: 'client.geo.city_name',
      ignore_above: 1024,
      level: 'core',
      name: 'city_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'City name.',
      type: 'keyword'
    },
    continent_code: {
      dashed_name: 'client-geo-continent-code',
      description: "Two-letter code representing continent's name.",
      example: 'NA',
      flat_name: 'client.geo.continent_code',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Continent code.',
      type: 'keyword'
    },
    continent_name: {
      dashed_name: 'client-geo-continent-name',
      description: 'Name of the continent.',
      example: 'North America',
      flat_name: 'client.geo.continent_name',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Name of the continent.',
      type: 'keyword'
    },
    country_iso_code: {
      dashed_name: 'client-geo-country-iso-code',
      description: 'Country ISO code.',
      example: 'CA',
      flat_name: 'client.geo.country_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'country_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country ISO code.',
      type: 'keyword'
    },
    country_name: {
      dashed_name: 'client-geo-country-name',
      description: 'Country name.',
      example: 'Canada',
      flat_name: 'client.geo.country_name',
      ignore_above: 1024,
      level: 'core',
      name: 'country_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country name.',
      type: 'keyword'
    },
    location: {
      dashed_name: 'client-geo-location',
      description: 'Longitude and latitude.',
      example: '{ "lon": -73.614830, "lat": 45.505918 }',
      flat_name: 'client.geo.location',
      level: 'core',
      name: 'location',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Longitude and latitude.',
      type: 'geo_point'
    },
    name: {
      dashed_name: 'client-geo-name',
      description: 'User-defined description of a location, at the level of granularity they care about.\n' +
        'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
        'Not typically used in automated geolocation.',
      example: 'boston-dc',
      flat_name: 'client.geo.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'User-defined description of a location.',
      type: 'keyword'
    },
    postal_code: {
      dashed_name: 'client-geo-postal-code',
      description: 'Postal code associated with the location.\n' +
        'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
      example: 94040,
      flat_name: 'client.geo.postal_code',
      ignore_above: 1024,
      level: 'core',
      name: 'postal_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Postal code.',
      type: 'keyword'
    },
    region_iso_code: {
      dashed_name: 'client-geo-region-iso-code',
      description: 'Region ISO code.',
      example: 'CA-QC',
      flat_name: 'client.geo.region_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'region_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region ISO code.',
      type: 'keyword'
    },
    region_name: {
      dashed_name: 'client-geo-region-name',
      description: 'Region name.',
      example: 'Quebec',
      flat_name: 'client.geo.region_name',
      ignore_above: 1024,
      level: 'core',
      name: 'region_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region name.',
      type: 'keyword'
    },
    timezone: {
      dashed_name: 'client-geo-timezone',
      description: 'The time zone of the location, such as IANA time zone name.',
      example: 'America/Argentina/Buenos_Aires',
      flat_name: 'client.geo.timezone',
      ignore_above: 1024,
      level: 'core',
      name: 'timezone',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Time zone.',
      type: 'keyword'
    }
  },
  ip: {
    dashed_name: 'client-ip',
    description: 'IP address of the client (IPv4 or IPv6).',
    flat_name: 'client.ip',
    level: 'core',
    name: 'ip',
    normalize: [],
    short: 'IP address of the client.',
    type: 'ip'
  },
  mac: {
    dashed_name: 'client-mac',
    description: 'MAC address of the client.\n' +
      'The notation format from RFC 7042 is suggested: Each octet (that is, 8-bit byte) is represented by two [uppercase] hexadecimal digits giving the value of the octet as an unsigned integer. Successive octets are separated by a hyphen.',
    example: '00-00-5E-00-53-23',
    flat_name: 'client.mac',
    ignore_above: 1024,
    level: 'core',
    name: 'mac',
    normalize: [],
    patther: '^[A-F0-9]{2}(-[A-F0-9]{2}){5,}$',
    short: 'MAC address of the client.',
    type: 'keyword'
  },
  nat: {
    ip: {
      dashed_name: 'client-nat-ip',
      description: 'Translated IP of source based NAT sessions (e.g. internal client to internet).\n' +
        'Typically connections traversing load balancers, firewalls, or routers.',
      flat_name: 'client.nat.ip',
      level: 'extended',
      name: 'nat.ip',
      normalize: [],
      short: 'Client NAT ip address',
      type: 'ip'
    },
    port: {
      dashed_name: 'client-nat-port',
      description: 'Translated port of source based NAT sessions (e.g. internal client to internet).\n' +
        'Typically connections traversing load balancers, firewalls, or routers.',
      flat_name: 'client.nat.port',
      format: 'string',
      level: 'extended',
      name: 'nat.port',
      normalize: [],
      short: 'Client NAT port',
      type: 'long'
    }
  },
  packets: {
    dashed_name: 'client-packets',
    description: 'Packets sent from the client to the server.',
    example: 12,
    flat_name: 'client.packets',
    level: 'core',
    name: 'packets',
    normalize: [],
    short: 'Packets sent from the client to the server.',
    type: 'long'
  },
  port: {
    dashed_name: 'client-port',
    description: 'Port of the client.',
    flat_name: 'client.port',
    format: 'string',
    level: 'core',
    name: 'port',
    normalize: [],
    short: 'Port of the client.',
    type: 'long'
  },
  registered_domain: {
    dashed_name: 'client-registered-domain',
    description: 'The highest registered client domain, stripped of the subdomain.\n' +
      'For example, the registered domain for "foo.example.com" is "example.com".\n' +
      'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".',
    example: 'example.com',
    flat_name: 'client.registered_domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'registered_domain',
    normalize: [],
    short: 'The highest registered client domain, stripped of the subdomain.',
    type: 'keyword'
  },
  subdomain: {
    dashed_name: 'client-subdomain',
    description: 'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.\n' +
      'For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.',
    example: 'east',
    flat_name: 'client.subdomain',
    ignore_above: 1024,
    level: 'extended',
    name: 'subdomain',
    normalize: [],
    short: 'The subdomain of the domain.',
    type: 'keyword'
  },
  top_level_domain: {
    dashed_name: 'client-top-level-domain',
    description: 'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".\n' +
      'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".',
    example: 'co.uk',
    flat_name: 'client.top_level_domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'top_level_domain',
    normalize: [],
    short: 'The effective top level domain (com, org, net, co.uk).',
    type: 'keyword'
  },
  user: {
    domain: {
      dashed_name: 'client-user-domain',
      description: 'Name of the directory the user is a member of.\n' +
        'For example, an LDAP or Active Directory domain name.',
      flat_name: 'client.user.domain',
      ignore_above: 1024,
      level: 'extended',
      name: 'domain',
      normalize: [],
      original_fieldset: 'user',
      short: 'Name of the directory the user is a member of.',
      type: 'keyword'
    },
    email: {
      dashed_name: 'client-user-email',
      description: 'User email address.',
      flat_name: 'client.user.email',
      ignore_above: 1024,
      level: 'extended',
      name: 'email',
      normalize: [],
      original_fieldset: 'user',
      short: 'User email address.',
      type: 'keyword'
    },
    full_name: {
      dashed_name: 'client-user-full-name',
      description: "User's full name, if available.",
      example: 'Albert Einstein',
      flat_name: 'client.user.full_name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'client.user.full_name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'full_name',
      normalize: [],
      original_fieldset: 'user',
      short: "User's full name, if available.",
      type: 'keyword'
    },
    group: {
      domain: {
        dashed_name: 'client-user-group-domain',
        description: 'Name of the directory the group is a member of.\n' +
          'For example, an LDAP or Active Directory domain name.',
        flat_name: 'client.user.group.domain',
        ignore_above: 1024,
        level: 'extended',
        name: 'domain',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the directory the group is a member of.',
        type: 'keyword'
      },
      id: {
        dashed_name: 'client-user-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'client.user.group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'client-user-group-name',
        description: 'Name of the group.',
        flat_name: 'client.user.group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    hash: {
      dashed_name: 'client-user-hash',
      description: 'Unique user hash to correlate information for a user in anonymized form.\n' +
        'Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
      flat_name: 'client.user.hash',
      ignore_above: 1024,
      level: 'extended',
      name: 'hash',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique user hash to correlate information for a user in anonymized form.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'client-user-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'client.user.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'client-user-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'client.user.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [
        {
          flat_name: 'client.user.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    },
    roles: {
      dashed_name: 'client-user-roles',
      description: 'Array of user roles at the time of the event.',
      example: '["kibana_admin", "reporting_user"]',
      flat_name: 'client.user.roles',
      ignore_above: 1024,
      level: 'extended',
      name: 'roles',
      normalize: [ 'array' ],
      original_fieldset: 'user',
      short: 'Array of user roles at the time of the event.',
      type: 'keyword'
    }
  }
}