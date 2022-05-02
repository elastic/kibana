export const elfEcs = {
  architecture: {
    dashed_name: 'elf-architecture',
    description: 'Machine architecture of the ELF file.',
    example: 'x86-64',
    flat_name: 'elf.architecture',
    ignore_above: 1024,
    level: 'extended',
    name: 'architecture',
    normalize: [],
    short: 'Machine architecture of the ELF file.',
    type: 'keyword'
  },
  byte_order: {
    dashed_name: 'elf-byte-order',
    description: 'Byte sequence of ELF file.',
    example: 'Little Endian',
    flat_name: 'elf.byte_order',
    ignore_above: 1024,
    level: 'extended',
    name: 'byte_order',
    normalize: [],
    short: 'Byte sequence of ELF file.',
    type: 'keyword'
  },
  cpu_type: {
    dashed_name: 'elf-cpu-type',
    description: 'CPU type of the ELF file.',
    example: 'Intel',
    flat_name: 'elf.cpu_type',
    ignore_above: 1024,
    level: 'extended',
    name: 'cpu_type',
    normalize: [],
    short: 'CPU type of the ELF file.',
    type: 'keyword'
  },
  creation_date: {
    dashed_name: 'elf-creation-date',
    description: "Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.",
    flat_name: 'elf.creation_date',
    level: 'extended',
    name: 'creation_date',
    normalize: [],
    short: 'Build or compile date.',
    type: 'date'
  },
  exports: {
    dashed_name: 'elf-exports',
    description: 'List of exported element names and types.',
    flat_name: 'elf.exports',
    level: 'extended',
    name: 'exports',
    normalize: [ 'array' ],
    short: 'List of exported element names and types.',
    type: 'flattened'
  },
  header: {
    abi_version: {
      dashed_name: 'elf-header-abi-version',
      description: 'Version of the ELF Application Binary Interface (ABI).',
      flat_name: 'elf.header.abi_version',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.abi_version',
      normalize: [],
      short: 'Version of the ELF Application Binary Interface (ABI).',
      type: 'keyword'
    },
    class: {
      dashed_name: 'elf-header-class',
      description: 'Header class of the ELF file.',
      flat_name: 'elf.header.class',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.class',
      normalize: [],
      short: 'Header class of the ELF file.',
      type: 'keyword'
    },
    data: {
      dashed_name: 'elf-header-data',
      description: 'Data table of the ELF header.',
      flat_name: 'elf.header.data',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.data',
      normalize: [],
      short: 'Data table of the ELF header.',
      type: 'keyword'
    },
    entrypoint: {
      dashed_name: 'elf-header-entrypoint',
      description: 'Header entrypoint of the ELF file.',
      flat_name: 'elf.header.entrypoint',
      format: 'string',
      level: 'extended',
      name: 'header.entrypoint',
      normalize: [],
      short: 'Header entrypoint of the ELF file.',
      type: 'long'
    },
    object_version: {
      dashed_name: 'elf-header-object-version',
      description: '"0x1" for original ELF files.',
      flat_name: 'elf.header.object_version',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.object_version',
      normalize: [],
      short: '"0x1" for original ELF files.',
      type: 'keyword'
    },
    os_abi: {
      dashed_name: 'elf-header-os-abi',
      description: 'Application Binary Interface (ABI) of the Linux OS.',
      flat_name: 'elf.header.os_abi',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.os_abi',
      normalize: [],
      short: 'Application Binary Interface (ABI) of the Linux OS.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'elf-header-type',
      description: 'Header type of the ELF file.',
      flat_name: 'elf.header.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.type',
      normalize: [],
      short: 'Header type of the ELF file.',
      type: 'keyword'
    },
    version: {
      dashed_name: 'elf-header-version',
      description: 'Version of the ELF header.',
      flat_name: 'elf.header.version',
      ignore_above: 1024,
      level: 'extended',
      name: 'header.version',
      normalize: [],
      short: 'Version of the ELF header.',
      type: 'keyword'
    }
  },
  imports: {
    dashed_name: 'elf-imports',
    description: 'List of imported element names and types.',
    flat_name: 'elf.imports',
    level: 'extended',
    name: 'imports',
    normalize: [ 'array' ],
    short: 'List of imported element names and types.',
    type: 'flattened'
  },
  sections: {
    dashed_name: 'elf-sections',
    description: 'An array containing an object for each section of the ELF file.\n' +
      'The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.',
    flat_name: 'elf.sections',
    level: 'extended',
    name: {
      dashed_name: 'elf-sections-name',
      description: 'ELF Section List name.',
      flat_name: 'elf.sections.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'sections.name',
      normalize: [],
      short: 'ELF Section List name.',
      type: 'keyword'
    },
    normalize: [ 'array' ],
    short: 'Section information of the ELF file.',
    type: {
      dashed_name: 'elf-sections-type',
      description: 'ELF Section List type.',
      flat_name: 'elf.sections.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'sections.type',
      normalize: [],
      short: 'ELF Section List type.',
      type: 'keyword'
    },
    chi2: {
      dashed_name: 'elf-sections-chi2',
      description: 'Chi-square probability distribution of the section.',
      flat_name: 'elf.sections.chi2',
      format: 'number',
      level: 'extended',
      name: 'sections.chi2',
      normalize: [],
      short: 'Chi-square probability distribution of the section.',
      type: 'long'
    },
    entropy: {
      dashed_name: 'elf-sections-entropy',
      description: 'Shannon entropy calculation from the section.',
      flat_name: 'elf.sections.entropy',
      format: 'number',
      level: 'extended',
      name: 'sections.entropy',
      normalize: [],
      short: 'Shannon entropy calculation from the section.',
      type: 'long'
    },
    flags: {
      dashed_name: 'elf-sections-flags',
      description: 'ELF Section List flags.',
      flat_name: 'elf.sections.flags',
      ignore_above: 1024,
      level: 'extended',
      name: 'sections.flags',
      normalize: [],
      short: 'ELF Section List flags.',
      type: 'keyword'
    },
    physical_offset: {
      dashed_name: 'elf-sections-physical-offset',
      description: 'ELF Section List offset.',
      flat_name: 'elf.sections.physical_offset',
      ignore_above: 1024,
      level: 'extended',
      name: 'sections.physical_offset',
      normalize: [],
      short: 'ELF Section List offset.',
      type: 'keyword'
    },
    physical_size: {
      dashed_name: 'elf-sections-physical-size',
      description: 'ELF Section List physical size.',
      flat_name: 'elf.sections.physical_size',
      format: 'bytes',
      level: 'extended',
      name: 'sections.physical_size',
      normalize: [],
      short: 'ELF Section List physical size.',
      type: 'long'
    },
    virtual_address: {
      dashed_name: 'elf-sections-virtual-address',
      description: 'ELF Section List virtual address.',
      flat_name: 'elf.sections.virtual_address',
      format: 'string',
      level: 'extended',
      name: 'sections.virtual_address',
      normalize: [],
      short: 'ELF Section List virtual address.',
      type: 'long'
    },
    virtual_size: {
      dashed_name: 'elf-sections-virtual-size',
      description: 'ELF Section List virtual size.',
      flat_name: 'elf.sections.virtual_size',
      format: 'string',
      level: 'extended',
      name: 'sections.virtual_size',
      normalize: [],
      short: 'ELF Section List virtual size.',
      type: 'long'
    }
  },
  segments: {
    dashed_name: 'elf-segments',
    description: 'An array containing an object for each segment of the ELF file.\n' +
      'The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.',
    flat_name: 'elf.segments',
    level: 'extended',
    name: 'segments',
    normalize: [ 'array' ],
    short: 'ELF object segment list.',
    type: {
      dashed_name: 'elf-segments-type',
      description: 'ELF object segment type.',
      flat_name: 'elf.segments.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'segments.type',
      normalize: [],
      short: 'ELF object segment type.',
      type: 'keyword'
    },
    sections: {
      dashed_name: 'elf-segments-sections',
      description: 'ELF object segment sections.',
      flat_name: 'elf.segments.sections',
      ignore_above: 1024,
      level: 'extended',
      name: 'segments.sections',
      normalize: [],
      short: 'ELF object segment sections.',
      type: 'keyword'
    }
  },
  shared_libraries: {
    dashed_name: 'elf-shared-libraries',
    description: 'List of shared libraries used by this ELF object.',
    flat_name: 'elf.shared_libraries',
    ignore_above: 1024,
    level: 'extended',
    name: 'shared_libraries',
    normalize: [ 'array' ],
    short: 'List of shared libraries used by this ELF object.',
    type: 'keyword'
  },
  telfhash: {
    dashed_name: 'elf-telfhash',
    description: 'telfhash symbol hash for ELF file.',
    flat_name: 'elf.telfhash',
    ignore_above: 1024,
    level: 'extended',
    name: 'telfhash',
    normalize: [],
    short: 'telfhash hash for ELF file.',
    type: 'keyword'
  }
}