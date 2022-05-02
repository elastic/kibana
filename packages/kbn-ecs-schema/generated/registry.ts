export const registryEcs = {
  data: {
    bytes: {
      dashed_name: 'registry-data-bytes',
      description: 'Original bytes written with base64 encoding.\n' +
        'For Windows registry operations, such as SetValueEx and RegQueryValueEx, this corresponds to the data pointed by `lp_data`. This is optional but provides better recoverability and should be populated for REG_BINARY encoded values.',
      example: 'ZQBuAC0AVQBTAAAAZQBuAAAAAAA=',
      flat_name: 'registry.data.bytes',
      ignore_above: 1024,
      level: 'extended',
      name: 'data.bytes',
      normalize: [],
      short: 'Original bytes written with base64 encoding.',
      type: 'keyword'
    },
    strings: {
      dashed_name: 'registry-data-strings',
      description: 'Content when writing string types.\n' +
        'Populated as an array when writing string data to the registry. For single string registry types (REG_SZ, REG_EXPAND_SZ), this should be an array with one string. For sequences of string with REG_MULTI_SZ, this array will be variable length. For numeric data, such as REG_DWORD and REG_QWORD, this should be populated with the decimal representation (e.g `"1"`).',
      example: '["C:\\rta\\red_ttp\\bin\\myapp.exe"]',
      flat_name: 'registry.data.strings',
      level: 'core',
      name: 'data.strings',
      normalize: [Array],
      short: 'List of strings representing what was written to the registry.',
      type: 'wildcard'
    },
    type: {
      dashed_name: 'registry-data-type',
      description: 'Standard registry type for encoding contents',
      example: 'REG_SZ',
      flat_name: 'registry.data.type',
      ignore_above: 1024,
      level: 'core',
      name: 'data.type',
      normalize: [],
      short: 'Standard registry type for encoding contents',
      type: 'keyword'
    }
  },
  hive: {
    dashed_name: 'registry-hive',
    description: 'Abbreviated name for the hive.',
    example: 'HKLM',
    flat_name: 'registry.hive',
    ignore_above: 1024,
    level: 'core',
    name: 'hive',
    normalize: [],
    short: 'Abbreviated name for the hive.',
    type: 'keyword'
  },
  key: {
    dashed_name: 'registry-key',
    description: 'Hive-relative path of keys.',
    example: 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe',
    flat_name: 'registry.key',
    ignore_above: 1024,
    level: 'core',
    name: 'key',
    normalize: [],
    short: 'Hive-relative path of keys.',
    type: 'keyword'
  },
  path: {
    dashed_name: 'registry-path',
    description: 'Full path, including hive, key and value',
    example: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe\\Debugger',
    flat_name: 'registry.path',
    ignore_above: 1024,
    level: 'core',
    name: 'path',
    normalize: [],
    short: 'Full path, including hive, key and value',
    type: 'keyword'
  },
  value: {
    dashed_name: 'registry-value',
    description: 'Name of the value written.',
    example: 'Debugger',
    flat_name: 'registry.value',
    ignore_above: 1024,
    level: 'core',
    name: 'value',
    normalize: [],
    short: 'Name of the value written.',
    type: 'keyword'
  }
}