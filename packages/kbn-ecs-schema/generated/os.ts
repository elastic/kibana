export const osEcs = {
  family: {
    dashed_name: 'os-family',
    description: 'OS family (such as redhat, debian, freebsd, windows).',
    example: 'debian',
    flat_name: 'os.family',
    ignore_above: 1024,
    level: 'extended',
    name: 'family',
    normalize: [],
    short: 'OS family (such as redhat, debian, freebsd, windows).',
    type: 'keyword'
  },
  full: {
    dashed_name: 'os-full',
    description: 'Operating system name, including the version or code name.',
    example: 'Mac OS Mojave',
    flat_name: 'os.full',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'full',
    normalize: [],
    short: 'Operating system name, including the version or code name.',
    type: 'keyword'
  },
  kernel: {
    dashed_name: 'os-kernel',
    description: 'Operating system kernel version as a raw string.',
    example: '4.4.0-112-generic',
    flat_name: 'os.kernel',
    ignore_above: 1024,
    level: 'extended',
    name: 'kernel',
    normalize: [],
    short: 'Operating system kernel version as a raw string.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'os-name',
    description: 'Operating system name, without the version.',
    example: 'Mac OS X',
    flat_name: 'os.name',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'name',
    normalize: [],
    short: 'Operating system name, without the version.',
    type: 'keyword'
  },
  platform: {
    dashed_name: 'os-platform',
    description: 'Operating system platform (such centos, ubuntu, windows).',
    example: 'darwin',
    flat_name: 'os.platform',
    ignore_above: 1024,
    level: 'extended',
    name: 'platform',
    normalize: [],
    short: 'Operating system platform (such centos, ubuntu, windows).',
    type: 'keyword'
  },
  type: {
    dashed_name: 'os-type',
    description: 'Use the `os.type` field to categorize the operating system into one of the broad commercial families.\n' +
      'One of these following values should be used (lowercase): linux, macos, unix, windows.\n' +
      "If the OS you're dealing with is not in the list, the field should not be populated. Please let us know by opening an issue with ECS, to propose its addition.",
    example: 'macos',
    flat_name: 'os.type',
    ignore_above: 1024,
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'Which commercial OS family (one of: linux, macos, unix or windows).',
    type: 'keyword'
  },
  version: {
    dashed_name: 'os-version',
    description: 'Operating system version as a raw string.',
    example: '10.14.1',
    flat_name: 'os.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'Operating system version as a raw string.',
    type: 'keyword'
  }
}