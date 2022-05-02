export const user_agentEcs = {
  device: {
    name: {
      dashed_name: 'user-agent-device-name',
      description: 'Name of the device.',
      example: 'iPhone',
      flat_name: 'user_agent.device.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'device.name',
      normalize: [],
      short: 'Name of the device.',
      type: 'keyword'
    }
  },
  name: {
    dashed_name: 'user-agent-name',
    description: 'Name of the user agent.',
    example: 'Safari',
    flat_name: 'user_agent.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Name of the user agent.',
    type: 'keyword'
  },
  original: {
    dashed_name: 'user-agent-original',
    description: 'Unparsed user_agent string.',
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
    flat_name: 'user_agent.original',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'original',
    normalize: [],
    short: 'Unparsed user_agent string.',
    type: 'keyword'
  },
  os: {
    family: {
      dashed_name: 'user-agent-os-family',
      description: 'OS family (such as redhat, debian, freebsd, windows).',
      example: 'debian',
      flat_name: 'user_agent.os.family',
      ignore_above: 1024,
      level: 'extended',
      name: 'family',
      normalize: [],
      original_fieldset: 'os',
      short: 'OS family (such as redhat, debian, freebsd, windows).',
      type: 'keyword'
    },
    full: {
      dashed_name: 'user-agent-os-full',
      description: 'Operating system name, including the version or code name.',
      example: 'Mac OS Mojave',
      flat_name: 'user_agent.os.full',
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
      dashed_name: 'user-agent-os-kernel',
      description: 'Operating system kernel version as a raw string.',
      example: '4.4.0-112-generic',
      flat_name: 'user_agent.os.kernel',
      ignore_above: 1024,
      level: 'extended',
      name: 'kernel',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system kernel version as a raw string.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'user-agent-os-name',
      description: 'Operating system name, without the version.',
      example: 'Mac OS X',
      flat_name: 'user_agent.os.name',
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
      dashed_name: 'user-agent-os-platform',
      description: 'Operating system platform (such centos, ubuntu, windows).',
      example: 'darwin',
      flat_name: 'user_agent.os.platform',
      ignore_above: 1024,
      level: 'extended',
      name: 'platform',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system platform (such centos, ubuntu, windows).',
      type: 'keyword'
    },
    type: {
      dashed_name: 'user-agent-os-type',
      description: 'Use the `os.type` field to categorize the operating system into one of the broad commercial families.\n' +
        'One of these following values should be used (lowercase): linux, macos, unix, windows.\n' +
        "If the OS you're dealing with is not in the list, the field should not be populated. Please let us know by opening an issue with ECS, to propose its addition.",
      example: 'macos',
      flat_name: 'user_agent.os.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'type',
      normalize: [],
      original_fieldset: 'os',
      short: 'Which commercial OS family (one of: linux, macos, unix or windows).',
      type: 'keyword'
    },
    version: {
      dashed_name: 'user-agent-os-version',
      description: 'Operating system version as a raw string.',
      example: '10.14.1',
      flat_name: 'user_agent.os.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'version',
      normalize: [],
      original_fieldset: 'os',
      short: 'Operating system version as a raw string.',
      type: 'keyword'
    }
  },
  version: {
    dashed_name: 'user-agent-version',
    description: 'Version of the user agent.',
    example: 12,
    flat_name: 'user_agent.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'Version of the user agent.',
    type: 'keyword'
  }
}