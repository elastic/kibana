export const hostEcs = {
  architecture: {
    dashed_name: 'host-architecture',
    description: 'Operating system architecture.',
    example: 'x86_64',
    flat_name: 'host.architecture',
    ignore_above: 1024,
    level: 'core',
    name: 'architecture',
    normalize: [],
    short: 'Operating system architecture.',
    type: 'keyword'
  },
  boot: {
    id: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'host-boot-id',
      description: 'Linux boot uuid taken from /proc/sys/kernel/random/boot_id. Note the boot_id value from /proc may or may not be the same in containers as on the host. Some container runtimes will bind mount a new boot_id value onto the proc file in each container.',
      example: '88a1f0ed-5ae5-41ee-af6b-41921c311872',
      flat_name: 'host.boot.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'boot.id',
      normalize: [],
      short: 'Linux boot uuid taken from /proc/sys/kernel/random/boot_id',
      type: 'keyword'
    }
  },
  cpu: {
    usage: {
      dashed_name: 'host-cpu-usage',
      description: 'Percent CPU used which is normalized by the number of CPU cores and it ranges from 0 to 1.\n' +
        'Scaling factor: 1000.\n' +
        'For example: For a two core host, this value should be the average of the two cores, between 0 and 1.',
      flat_name: 'host.cpu.usage',
      level: 'extended',
      name: 'cpu.usage',
      normalize: [],
      scaling_factor: 1000,
      short: 'Percent CPU used, between 0 and 1.',
      type: 'scaled_float'
    }
  },
  disk: { read: { bytes: [Object] }, write: { bytes: [Object] } },
  domain: {
    dashed_name: 'host-domain',
    description: 'Name of the domain of which the host is a member.\n' +
      "For example, on Windows this could be the host's Active Directory domain or NetBIOS domain name. For Linux this could be the domain of the host's LDAP provider.",
    example: 'CONTOSO',
    flat_name: 'host.domain',
    ignore_above: 1024,
    level: 'extended',
    name: 'domain',
    normalize: [],
    short: 'Name of the directory the group is a member of.',
    type: 'keyword'
  },
  geo: {
    city_name: {
      dashed_name: 'host-geo-city-name',
      description: 'City name.',
      example: 'Montreal',
      flat_name: 'host.geo.city_name',
      ignore_above: 1024,
      level: 'core',
      name: 'city_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'City name.',
      type: 'keyword'
    },
    continent_code: {
      dashed_name: 'host-geo-continent-code',
      description: "Two-letter code representing continent's name.",
      example: 'NA',
      flat_name: 'host.geo.continent_code',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Continent code.',
      type: 'keyword'
    },
    continent_name: {
      dashed_name: 'host-geo-continent-name',
      description: 'Name of the continent.',
      example: 'North America',
      flat_name: 'host.geo.continent_name',
      ignore_above: 1024,
      level: 'core',
      name: 'continent_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Name of the continent.',
      type: 'keyword'
    },
    country_iso_code: {
      dashed_name: 'host-geo-country-iso-code',
      description: 'Country ISO code.',
      example: 'CA',
      flat_name: 'host.geo.country_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'country_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country ISO code.',
      type: 'keyword'
    },
    country_name: {
      dashed_name: 'host-geo-country-name',
      description: 'Country name.',
      example: 'Canada',
      flat_name: 'host.geo.country_name',
      ignore_above: 1024,
      level: 'core',
      name: 'country_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Country name.',
      type: 'keyword'
    },
    location: {
      dashed_name: 'host-geo-location',
      description: 'Longitude and latitude.',
      example: '{ "lon": -73.614830, "lat": 45.505918 }',
      flat_name: 'host.geo.location',
      level: 'core',
      name: 'location',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Longitude and latitude.',
      type: 'geo_point'
    },
    name: {
      dashed_name: 'host-geo-name',
      description: 'User-defined description of a location, at the level of granularity they care about.\n' +
        'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
        'Not typically used in automated geolocation.',
      example: 'boston-dc',
      flat_name: 'host.geo.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'User-defined description of a location.',
      type: 'keyword'
    },
    postal_code: {
      dashed_name: 'host-geo-postal-code',
      description: 'Postal code associated with the location.\n' +
        'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
      example: 94040,
      flat_name: 'host.geo.postal_code',
      ignore_above: 1024,
      level: 'core',
      name: 'postal_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Postal code.',
      type: 'keyword'
    },
    region_iso_code: {
      dashed_name: 'host-geo-region-iso-code',
      description: 'Region ISO code.',
      example: 'CA-QC',
      flat_name: 'host.geo.region_iso_code',
      ignore_above: 1024,
      level: 'core',
      name: 'region_iso_code',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region ISO code.',
      type: 'keyword'
    },
    region_name: {
      dashed_name: 'host-geo-region-name',
      description: 'Region name.',
      example: 'Quebec',
      flat_name: 'host.geo.region_name',
      ignore_above: 1024,
      level: 'core',
      name: 'region_name',
      normalize: [],
      original_fieldset: 'geo',
      short: 'Region name.',
      type: 'keyword'
    },
    timezone: {
      dashed_name: 'host-geo-timezone',
      description: 'The time zone of the location, such as IANA time zone name.',
      example: 'America/Argentina/Buenos_Aires',
      flat_name: 'host.geo.timezone',
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
    dashed_name: 'host-hostname',
    description: 'Hostname of the host.\n' +
      'It normally contains what the `hostname` command returns on the host machine.',
    flat_name: 'host.hostname',
    ignore_above: 1024,
    level: 'core',
    name: 'hostname',
    normalize: [],
    short: 'Hostname of the host.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'host-id',
    description: 'Unique host id.\n' +
      'As hostname is not always unique, use values that are meaningful in your environment.\n' +
      'Example: The current usage of `beat.name`.',
    flat_name: 'host.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique host id.',
    type: 'keyword'
  },
  ip: {
    dashed_name: 'host-ip',
    description: 'Host ip addresses.',
    flat_name: 'host.ip',
    level: 'core',
    name: 'ip',
    normalize: [ 'array' ],
    short: 'Host ip addresses.',
    type: 'ip'
  },
  mac: {
    dashed_name: 'host-mac',
    description: 'Host MAC addresses.\n' +
      'The notation format from RFC 7042 is suggested: Each octet (that is, 8-bit byte) is represented by two [uppercase] hexadecimal digits giving the value of the octet as an unsigned integer. Successive octets are separated by a hyphen.',
    example: '["00-00-5E-00-53-23", "00-00-5E-00-53-24"]',
    flat_name: 'host.mac',
    ignore_above: 1024,
    level: 'core',
    name: 'mac',
    normalize: [ 'array' ],
    short: 'Host MAC addresses.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'host-name',
    description: 'Name of the host.\n' +
      'It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
    flat_name: 'host.name',
    ignore_above: 1024,
    level: 'core',
    name: 'name',
    normalize: [],
    short: 'Name of the host.',
    type: 'keyword'
  },
  network: {
    egress: { bytes: [Object], packets: [Object] },
    ingress: { bytes: [Object], packets: [Object] }
  },
  os: {
    family: {
      dashed_name: 'host-os-family',
      description: 'OS family (such as redhat, debian, freebsd, windows).',
      example: 'debian',
      flat_name: 'host.os.family',
      ignore_above: 1024,
      level: 'extended',
      name: 'family',
      normalize: [],
      original_fieldset: 'os',
      short: 'OS family (such as redhat, debian, freebsd, windows).',
      type: 'keyword'
    },
    full: {
      dashed_name: 'host-os-full',
      description: 'Operating system name, including the version or code name.',
      example: 'Mac OS Mojave',
      flat_name: 'host.os.full',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'full',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system name, including the version or code name.',
      type: 'keyword'
    },
    kernel: {
      dashed_name: 'host-os-kernel',
      description: 'Operating system kernel version as a raw string.',
      example: '4.4.0-112-generic',
      flat_name: 'host.os.kernel',
      ignore_above: 1024,
      level: 'extended',
      name: 'kernel',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system kernel version as a raw string.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'host-os-name',
      description: 'Operating system name, without the version.',
      example: 'Mac OS X',
      flat_name: 'host.os.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [Array],
      name: 'name',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system name, without the version.',
      type: 'keyword'
    },
    platform: {
      dashed_name: 'host-os-platform',
      description: 'Operating system platform (such centos, ubuntu, windows).',
      example: 'darwin',
      flat_name: 'host.os.platform',
      ignore_above: 1024,
      level: 'extended',
      name: 'platform',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system platform (such centos, ubuntu, windows).',
      type: 'keyword'
    },
    type: {
      dashed_name: 'host-os-type',
      description: 'Use the `os.type` field to categorize the operating system into one of the broad commercial families.\n' +
        'One of these following values should be used (lowercase): linux, macos, unix, windows.\n' +
        "If the OS you're dealing with is not in the list, the field should not be populated. Please let us know by opening an issue with ECS, to propose its addition.",
      example: 'macos',
      flat_name: 'host.os.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'type',
      normalize: [],
      original_fieldset: 'os',
      short: 'Which commercial OS family (one of: linux, macos, unix or windows).',
      type: 'keyword'
    },
    version: {
      dashed_name: 'host-os-version',
      description: 'Operating system version as a raw string.',
      example: '10.14.1',
      flat_name: 'host.os.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'version',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system version as a raw string.',
      type: 'keyword'
    }
  },
  pid_ns_ino: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'host-pid-ns-ino',
    description: 'This is the inode number of the namespace in the namespace file system (nsfs). Unsigned int inum in include/linux/ns_common.h.',
    example: 256383,
    flat_name: 'host.pid_ns_ino',
    ignore_above: 1024,
    level: 'extended',
    name: 'pid_ns_ino',
    normalize: [],
    short: 'Pid namespace inode',
    type: 'keyword'
  },
  type: {
    dashed_name: 'host-type',
    description: 'Type of host.\n' +
      'For Cloud providers this can be the machine type like `t2.medium`. If vm, this could be the container, for example, or other information meaningful in your environment.',
    flat_name: 'host.type',
    ignore_above: 1024,
    level: 'core',
    name: 'type',
    normalize: [],
    short: 'Type of host.',
    type: 'keyword'
  },
  uptime: {
    dashed_name: 'host-uptime',
    description: 'Seconds the host has been up.',
    example: 1325,
    flat_name: 'host.uptime',
    level: 'extended',
    name: 'uptime',
    normalize: [],
    short: 'Seconds the host has been up.',
    type: 'long'
  }
}