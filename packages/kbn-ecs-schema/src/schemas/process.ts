/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
export const processEcs = {
  args: {
    dashed_name: 'process-args',
    description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
      'May be filtered to protect sensitive information.',
    example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
    flat_name: 'process.args',
    ignore_above: 1024,
    level: 'extended',
    name: 'args',
    normalize: [ 'array' ],
    short: 'Array of process arguments.',
    type: 'keyword'
  },
  args_count: {
    dashed_name: 'process-args-count',
    description: 'Length of the process.args array.\n' +
      'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
    example: 4,
    flat_name: 'process.args_count',
    level: 'extended',
    name: 'args_count',
    normalize: [],
    short: 'Length of the process.args array.',
    type: 'long'
  },
  code_signature: {
    digest_algorithm: {
      dashed_name: 'process-code-signature-digest-algorithm',
      description: 'The hashing algorithm used to sign the process.\n' +
        'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
      example: 'sha256',
      flat_name: 'process.code_signature.digest_algorithm',
      ignore_above: 1024,
      level: 'extended',
      name: 'digest_algorithm',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Hashing algorithm used to sign the process.',
      type: 'keyword'
    },
    exists: {
      dashed_name: 'process-code-signature-exists',
      description: 'Boolean to capture if a signature is present.',
      example: 'true',
      flat_name: 'process.code_signature.exists',
      level: 'core',
      name: 'exists',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Boolean to capture if a signature is present.',
      type: 'boolean'
    },
    signing_id: {
      dashed_name: 'process-code-signature-signing-id',
      description: 'The identifier used to sign the process.\n' +
        'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
      example: 'com.apple.xpc.proxy',
      flat_name: 'process.code_signature.signing_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'signing_id',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'The identifier used to sign the process.',
      type: 'keyword'
    },
    status: {
      dashed_name: 'process-code-signature-status',
      description: 'Additional information about the certificate status.\n' +
        'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
      example: 'ERROR_UNTRUSTED_ROOT',
      flat_name: 'process.code_signature.status',
      ignore_above: 1024,
      level: 'extended',
      name: 'status',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Additional information about the certificate status.',
      type: 'keyword'
    },
    subject_name: {
      dashed_name: 'process-code-signature-subject-name',
      description: 'Subject name of the code signer',
      example: 'Microsoft Corporation',
      flat_name: 'process.code_signature.subject_name',
      ignore_above: 1024,
      level: 'core',
      name: 'subject_name',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Subject name of the code signer',
      type: 'keyword'
    },
    team_id: {
      dashed_name: 'process-code-signature-team-id',
      description: 'The team identifier used to sign the process.\n' +
        'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
      example: 'EQHXZ8M8AV',
      flat_name: 'process.code_signature.team_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'team_id',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'The team identifier used to sign the process.',
      type: 'keyword'
    },
    timestamp: {
      dashed_name: 'process-code-signature-timestamp',
      description: 'Date and time when the code signature was generated and signed.',
      example: '2021-01-01T12:10:30Z',
      flat_name: 'process.code_signature.timestamp',
      level: 'extended',
      name: 'timestamp',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'When the signature was generated and signed.',
      type: 'date'
    },
    trusted: {
      dashed_name: 'process-code-signature-trusted',
      description: 'Stores the trust status of the certificate chain.\n' +
        'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
      example: 'true',
      flat_name: 'process.code_signature.trusted',
      level: 'extended',
      name: 'trusted',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Stores the trust status of the certificate chain.',
      type: 'boolean'
    },
    valid: {
      dashed_name: 'process-code-signature-valid',
      description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
        'Leave unpopulated if a certificate was unchecked.',
      example: 'true',
      flat_name: 'process.code_signature.valid',
      level: 'extended',
      name: 'valid',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Boolean to capture if the digital signature is verified against the binary content.',
      type: 'boolean'
    }
  },
  command_line: {
    dashed_name: 'process-command-line',
    description: 'Full command line that started the process, including the absolute path to the executable, and all arguments.\n' +
      'Some arguments may be filtered to protect sensitive information.',
    example: '/usr/bin/ssh -l user 10.0.0.16',
    flat_name: 'process.command_line',
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'process.command_line.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'command_line',
    normalize: [],
    short: 'Full command line that started the process.',
    type: 'wildcard'
  },
  elf: {
    architecture: {
      dashed_name: 'process-elf-architecture',
      description: 'Machine architecture of the ELF file.',
      example: 'x86-64',
      flat_name: 'process.elf.architecture',
      ignore_above: 1024,
      level: 'extended',
      name: 'architecture',
      normalize: [],
      original_fieldset: 'elf',
      short: 'Machine architecture of the ELF file.',
      type: 'keyword'
    },
    byte_order: {
      dashed_name: 'process-elf-byte-order',
      description: 'Byte sequence of ELF file.',
      example: 'Little Endian',
      flat_name: 'process.elf.byte_order',
      ignore_above: 1024,
      level: 'extended',
      name: 'byte_order',
      normalize: [],
      original_fieldset: 'elf',
      short: 'Byte sequence of ELF file.',
      type: 'keyword'
    },
    cpu_type: {
      dashed_name: 'process-elf-cpu-type',
      description: 'CPU type of the ELF file.',
      example: 'Intel',
      flat_name: 'process.elf.cpu_type',
      ignore_above: 1024,
      level: 'extended',
      name: 'cpu_type',
      normalize: [],
      original_fieldset: 'elf',
      short: 'CPU type of the ELF file.',
      type: 'keyword'
    },
    creation_date: {
      dashed_name: 'process-elf-creation-date',
      description: "Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.",
      flat_name: 'process.elf.creation_date',
      level: 'extended',
      name: 'creation_date',
      normalize: [],
      original_fieldset: 'elf',
      short: 'Build or compile date.',
      type: 'date'
    },
    exports: {
      dashed_name: 'process-elf-exports',
      description: 'List of exported element names and types.',
      flat_name: 'process.elf.exports',
      level: 'extended',
      name: 'exports',
      normalize: [ 'array' ],
      original_fieldset: 'elf',
      short: 'List of exported element names and types.',
      type: 'flattened'
    },
    header: {
      abi_version: {
        dashed_name: 'process-elf-header-abi-version',
        description: 'Version of the ELF Application Binary Interface (ABI).',
        flat_name: 'process.elf.header.abi_version',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.abi_version',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Version of the ELF Application Binary Interface (ABI).',
        type: 'keyword'
      },
      class: {
        dashed_name: 'process-elf-header-class',
        description: 'Header class of the ELF file.',
        flat_name: 'process.elf.header.class',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.class',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Header class of the ELF file.',
        type: 'keyword'
      },
      data: {
        dashed_name: 'process-elf-header-data',
        description: 'Data table of the ELF header.',
        flat_name: 'process.elf.header.data',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.data',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Data table of the ELF header.',
        type: 'keyword'
      },
      entrypoint: {
        dashed_name: 'process-elf-header-entrypoint',
        description: 'Header entrypoint of the ELF file.',
        flat_name: 'process.elf.header.entrypoint',
        format: 'string',
        level: 'extended',
        name: 'header.entrypoint',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Header entrypoint of the ELF file.',
        type: 'long'
      },
      object_version: {
        dashed_name: 'process-elf-header-object-version',
        description: '"0x1" for original ELF files.',
        flat_name: 'process.elf.header.object_version',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.object_version',
        normalize: [],
        original_fieldset: 'elf',
        short: '"0x1" for original ELF files.',
        type: 'keyword'
      },
      os_abi: {
        dashed_name: 'process-elf-header-os-abi',
        description: 'Application Binary Interface (ABI) of the Linux OS.',
        flat_name: 'process.elf.header.os_abi',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.os_abi',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Application Binary Interface (ABI) of the Linux OS.',
        type: 'keyword'
      },
      type: {
        dashed_name: 'process-elf-header-type',
        description: 'Header type of the ELF file.',
        flat_name: 'process.elf.header.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.type',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Header type of the ELF file.',
        type: 'keyword'
      },
      version: {
        dashed_name: 'process-elf-header-version',
        description: 'Version of the ELF header.',
        flat_name: 'process.elf.header.version',
        ignore_above: 1024,
        level: 'extended',
        name: 'header.version',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Version of the ELF header.',
        type: 'keyword'
      }
    },
    imports: {
      dashed_name: 'process-elf-imports',
      description: 'List of imported element names and types.',
      flat_name: 'process.elf.imports',
      level: 'extended',
      name: 'imports',
      normalize: [ 'array' ],
      original_fieldset: 'elf',
      short: 'List of imported element names and types.',
      type: 'flattened'
    },
    sections: {
      dashed_name: 'process-elf-sections',
      description: 'An array containing an object for each section of the ELF file.\n' +
        'The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.',
      flat_name: 'process.elf.sections',
      level: 'extended',
      name: {
        dashed_name: 'process-elf-sections-name',
        description: 'ELF Section List name.',
        flat_name: 'process.elf.sections.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'sections.name',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List name.',
        type: 'keyword'
      },
      normalize: [ 'array' ],
      original_fieldset: 'elf',
      short: 'Section information of the ELF file.',
      type: {
        dashed_name: 'process-elf-sections-type',
        description: 'ELF Section List type.',
        flat_name: 'process.elf.sections.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'sections.type',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List type.',
        type: 'keyword'
      },
      chi2: {
        dashed_name: 'process-elf-sections-chi2',
        description: 'Chi-square probability distribution of the section.',
        flat_name: 'process.elf.sections.chi2',
        format: 'number',
        level: 'extended',
        name: 'sections.chi2',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Chi-square probability distribution of the section.',
        type: 'long'
      },
      entropy: {
        dashed_name: 'process-elf-sections-entropy',
        description: 'Shannon entropy calculation from the section.',
        flat_name: 'process.elf.sections.entropy',
        format: 'number',
        level: 'extended',
        name: 'sections.entropy',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Shannon entropy calculation from the section.',
        type: 'long'
      },
      flags: {
        dashed_name: 'process-elf-sections-flags',
        description: 'ELF Section List flags.',
        flat_name: 'process.elf.sections.flags',
        ignore_above: 1024,
        level: 'extended',
        name: 'sections.flags',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List flags.',
        type: 'keyword'
      },
      physical_offset: {
        dashed_name: 'process-elf-sections-physical-offset',
        description: 'ELF Section List offset.',
        flat_name: 'process.elf.sections.physical_offset',
        ignore_above: 1024,
        level: 'extended',
        name: 'sections.physical_offset',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List offset.',
        type: 'keyword'
      },
      physical_size: {
        dashed_name: 'process-elf-sections-physical-size',
        description: 'ELF Section List physical size.',
        flat_name: 'process.elf.sections.physical_size',
        format: 'bytes',
        level: 'extended',
        name: 'sections.physical_size',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List physical size.',
        type: 'long'
      },
      virtual_address: {
        dashed_name: 'process-elf-sections-virtual-address',
        description: 'ELF Section List virtual address.',
        flat_name: 'process.elf.sections.virtual_address',
        format: 'string',
        level: 'extended',
        name: 'sections.virtual_address',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List virtual address.',
        type: 'long'
      },
      virtual_size: {
        dashed_name: 'process-elf-sections-virtual-size',
        description: 'ELF Section List virtual size.',
        flat_name: 'process.elf.sections.virtual_size',
        format: 'string',
        level: 'extended',
        name: 'sections.virtual_size',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF Section List virtual size.',
        type: 'long'
      }
    },
    segments: {
      dashed_name: 'process-elf-segments',
      description: 'An array containing an object for each segment of the ELF file.\n' +
        'The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.',
      flat_name: 'process.elf.segments',
      level: 'extended',
      name: 'segments',
      normalize: [ 'array' ],
      original_fieldset: 'elf',
      short: 'ELF object segment list.',
      type: {
        dashed_name: 'process-elf-segments-type',
        description: 'ELF object segment type.',
        flat_name: 'process.elf.segments.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'segments.type',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF object segment type.',
        type: 'keyword'
      },
      sections: {
        dashed_name: 'process-elf-segments-sections',
        description: 'ELF object segment sections.',
        flat_name: 'process.elf.segments.sections',
        ignore_above: 1024,
        level: 'extended',
        name: 'segments.sections',
        normalize: [],
        original_fieldset: 'elf',
        short: 'ELF object segment sections.',
        type: 'keyword'
      }
    },
    shared_libraries: {
      dashed_name: 'process-elf-shared-libraries',
      description: 'List of shared libraries used by this ELF object.',
      flat_name: 'process.elf.shared_libraries',
      ignore_above: 1024,
      level: 'extended',
      name: 'shared_libraries',
      normalize: [ 'array' ],
      original_fieldset: 'elf',
      short: 'List of shared libraries used by this ELF object.',
      type: 'keyword'
    },
    telfhash: {
      dashed_name: 'process-elf-telfhash',
      description: 'telfhash symbol hash for ELF file.',
      flat_name: 'process.elf.telfhash',
      ignore_above: 1024,
      level: 'extended',
      name: 'telfhash',
      normalize: [],
      original_fieldset: 'elf',
      short: 'telfhash hash for ELF file.',
      type: 'keyword'
    }
  },
  end: {
    dashed_name: 'process-end',
    description: 'The time the process ended.',
    example: '2016-05-23T08:05:34.853Z',
    flat_name: 'process.end',
    level: 'extended',
    name: 'end',
    normalize: [],
    short: 'The time the process ended.',
    type: 'date'
  },
  entity_id: {
    dashed_name: 'process-entity-id',
    description: 'Unique identifier for the process.\n' +
      'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
      'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
    example: 'c2c455d9f99375d',
    flat_name: 'process.entity_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'entity_id',
    normalize: [],
    short: 'Unique identifier for the process.',
    type: 'keyword'
  },
  entry_leader: {
    args: {
      dashed_name: 'process-entry-leader-args',
      description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
        'May be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
      flat_name: 'process.entry_leader.args',
      ignore_above: 1024,
      level: 'extended',
      name: 'args',
      normalize: [ 'array' ],
      original_fieldset: 'process',
      short: 'Array of process arguments.',
      type: 'keyword'
    },
    args_count: {
      dashed_name: 'process-entry-leader-args-count',
      description: 'Length of the process.args array.\n' +
        'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
      example: 4,
      flat_name: 'process.entry_leader.args_count',
      level: 'extended',
      name: 'args_count',
      normalize: [],
      original_fieldset: 'process',
      short: 'Length of the process.args array.',
      type: 'long'
    },
    command_line: {
      dashed_name: 'process-entry-leader-command-line',
      description: 'Full command line that started the process, including the absolute path to the executable, and all arguments.\n' +
        'Some arguments may be filtered to protect sensitive information.',
      example: '/usr/bin/ssh -l user 10.0.0.16',
      flat_name: 'process.entry_leader.command_line',
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.entry_leader.command_line.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'command_line',
      normalize: [],
      original_fieldset: 'process',
      short: 'Full command line that started the process.',
      type: 'wildcard'
    },
    entity_id: {
      dashed_name: 'process-entry-leader-entity-id',
      description: 'Unique identifier for the process.\n' +
        'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
        'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
      example: 'c2c455d9f99375d',
      flat_name: 'process.entry_leader.entity_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'entity_id',
      normalize: [],
      original_fieldset: 'process',
      short: 'Unique identifier for the process.',
      type: 'keyword'
    },
    entry_meta: {
      source: {
        ip: {
          dashed_name: 'process-entry-leader-entry-meta-source-ip',
          description: 'IP address of the source (IPv4 or IPv6).',
          flat_name: 'process.entry_leader.entry_meta.source.ip',
          level: 'core',
          name: 'ip',
          normalize: [],
          original_fieldset: 'source',
          short: 'IP address of the source.',
          type: 'ip'
        }
      },
      type: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'process-entry-leader-entry-meta-type',
        description: 'The entry type for the entry session leader. Values include: init(e.g systemd), sshd, ssm, kubelet, teleport, terminal, console',
        flat_name: 'process.entry_leader.entry_meta.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'entry_meta.type',
        normalize: [],
        original_fieldset: 'process',
        short: 'The entry type for the entry session leader.',
        type: 'keyword'
      }
    },
    executable: {
      dashed_name: 'process-entry-leader-executable',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      flat_name: 'process.entry_leader.executable',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.entry_leader.executable.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'executable',
      normalize: [],
      original_fieldset: 'process',
      short: 'Absolute path to the process executable.',
      type: 'keyword'
    },
    group: {
      id: {
        dashed_name: 'process-entry-leader-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.entry_leader.group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-group-name',
        description: 'Name of the group.',
        flat_name: 'process.entry_leader.group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    interactive: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-entry-leader-interactive',
      description: 'Whether the process is connected to an interactive shell.\n' +
        'Process interactivity is inferred from the processes file descriptors. If the character device for the controlling tty is the same as stdin and stderr for the process, the process is considered interactive.\n' +
        'Note: A non-interactive process can belong to an interactive session and is simply one that does not have open file descriptors reading the controlling TTY on FD 0 (stdin) or writing to the controlling TTY on FD 2 (stderr). A backgrounded process is still considered interactive if stdin and stderr are connected to the controlling TTY.',
      example: true,
      flat_name: 'process.entry_leader.interactive',
      level: 'extended',
      name: 'interactive',
      normalize: [],
      original_fieldset: 'process',
      short: 'Whether the process is connected to an interactive shell.',
      type: 'boolean'
    },
    name: {
      dashed_name: 'process-entry-leader-name',
      description: 'Process name.\nSometimes called program name or similar.',
      example: 'ssh',
      flat_name: 'process.entry_leader.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.entry_leader.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process name.',
      type: 'keyword'
    },
    parent: {
      entity_id: {
        dashed_name: 'process-entry-leader-parent-entity-id',
        description: 'Unique identifier for the process.\n' +
          'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
          'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
        example: 'c2c455d9f99375d',
        flat_name: 'process.entry_leader.parent.entity_id',
        ignore_above: 1024,
        level: 'extended',
        name: 'entity_id',
        normalize: [],
        original_fieldset: 'process',
        short: 'Unique identifier for the process.',
        type: 'keyword'
      },
      pid: {
        dashed_name: 'process-entry-leader-parent-pid',
        description: 'Process id.',
        example: 4242,
        flat_name: 'process.entry_leader.parent.pid',
        format: 'string',
        level: 'core',
        name: 'pid',
        normalize: [],
        original_fieldset: 'process',
        short: 'Process id.',
        type: 'long'
      },
      session_leader: {
        entity_id: {
          dashed_name: 'process-entry-leader-parent-session-leader-entity-id',
          description: 'Unique identifier for the process.\n' +
            'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
            'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
          example: 'c2c455d9f99375d',
          flat_name: 'process.entry_leader.parent.session_leader.entity_id',
          ignore_above: 1024,
          level: 'extended',
          name: 'entity_id',
          normalize: [],
          original_fieldset: 'process',
          short: 'Unique identifier for the process.',
          type: 'keyword'
        },
        pid: {
          dashed_name: 'process-entry-leader-parent-session-leader-pid',
          description: 'Process id.',
          example: 4242,
          flat_name: 'process.entry_leader.parent.session_leader.pid',
          format: 'string',
          level: 'core',
          name: 'pid',
          normalize: [],
          original_fieldset: 'process',
          short: 'Process id.',
          type: 'long'
        },
        start: {
          dashed_name: 'process-entry-leader-parent-session-leader-start',
          description: 'The time the process started.',
          example: '2016-05-23T08:05:34.853Z',
          flat_name: 'process.entry_leader.parent.session_leader.start',
          level: 'extended',
          name: 'start',
          normalize: [],
          original_fieldset: 'process',
          short: 'The time the process started.',
          type: 'date'
        }
      },
      start: {
        dashed_name: 'process-entry-leader-parent-start',
        description: 'The time the process started.',
        example: '2016-05-23T08:05:34.853Z',
        flat_name: 'process.entry_leader.parent.start',
        level: 'extended',
        name: 'start',
        normalize: [],
        original_fieldset: 'process',
        short: 'The time the process started.',
        type: 'date'
      }
    },
    pid: {
      dashed_name: 'process-entry-leader-pid',
      description: 'Process id.',
      example: 4242,
      flat_name: 'process.entry_leader.pid',
      format: 'string',
      level: 'core',
      name: 'pid',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process id.',
      type: 'long'
    },
    real_group: {
      id: {
        dashed_name: 'process-entry-leader-real-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.entry_leader.real_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-real-group-name',
        description: 'Name of the group.',
        flat_name: 'process.entry_leader.real_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    real_user: {
      id: {
        dashed_name: 'process-entry-leader-real-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.entry_leader.real_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-real-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.entry_leader.real_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.entry_leader.real_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    same_as_process: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-entry-leader-same-as-process',
      description: 'This boolean is used to identify if a leader process is the same as the top level process.\n' +
        'For example, if `process.group_leader.same_as_process = true`, it means the process event in question is the leader of its process group. Details under `process.*` like `pid` would be the same under `process.group_leader.*` The same applies for both `process.session_leader` and `process.entry_leader`.\n' +
        "This field exists to the benefit of EQL and other rule engines since it's not possible to compare equality between two fields in a single document. e.g `process.entity_id` = `process.group_leader.entity_id` (top level process is the process group leader) OR `process.entity_id` = `process.entry_leader.entity_id` (top level process is the entry session leader)\n" +
        'Instead these rules could be written like: `process.group_leader.same_as_process: true` OR `process.entry_leader.same_as_process: true`\n' +
        'Note: This field is only set on `process.entry_leader`, `process.session_leader` and `process.group_leader`.',
      example: true,
      flat_name: 'process.entry_leader.same_as_process',
      level: 'extended',
      name: 'same_as_process',
      normalize: [],
      original_fieldset: 'process',
      short: 'This boolean is used to identify if a leader process is the same as the top level process.',
      type: 'boolean'
    },
    saved_group: {
      id: {
        dashed_name: 'process-entry-leader-saved-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.entry_leader.saved_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-saved-group-name',
        description: 'Name of the group.',
        flat_name: 'process.entry_leader.saved_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    saved_user: {
      id: {
        dashed_name: 'process-entry-leader-saved-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.entry_leader.saved_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-saved-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.entry_leader.saved_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.entry_leader.saved_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    start: {
      dashed_name: 'process-entry-leader-start',
      description: 'The time the process started.',
      example: '2016-05-23T08:05:34.853Z',
      flat_name: 'process.entry_leader.start',
      level: 'extended',
      name: 'start',
      normalize: [],
      original_fieldset: 'process',
      short: 'The time the process started.',
      type: 'date'
    },
    supplemental_groups: {
      id: {
        dashed_name: 'process-entry-leader-supplemental-groups-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.entry_leader.supplemental_groups.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-supplemental-groups-name',
        description: 'Name of the group.',
        flat_name: 'process.entry_leader.supplemental_groups.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    tty: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-entry-leader-tty',
      description: 'Information about the controlling TTY device. If set, the process belongs to an interactive session.',
      flat_name: 'process.entry_leader.tty',
      level: 'extended',
      name: 'tty',
      normalize: [],
      original_fieldset: 'process',
      short: 'Information about the controlling TTY device.',
      type: 'object',
      char_device: {
        major: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-entry-leader-tty-char-device-major',
          description: `The major number identifies the driver associated with the device. The character device's major and minor numbers can be algorithmically combined to produce the more familiar terminal identifiers such as "ttyS0" and "pts/0. For more details, please refer to the Linux kernel documentation.`,
          example: 1,
          flat_name: 'process.entry_leader.tty.char_device.major',
          level: 'extended',
          name: 'tty.char_device.major',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's major number.",
          type: 'long'
        },
        minor: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-entry-leader-tty-char-device-minor',
          description: 'The minor number is used only by the driver specified by the major number; other parts of the kernel don’t use it, and merely pass it along to the driver. It is common for a driver to control several devices; the minor number provides a way for the driver to differentiate among them.',
          example: 128,
          flat_name: 'process.entry_leader.tty.char_device.minor',
          level: 'extended',
          name: 'tty.char_device.minor',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's minor number.",
          type: 'long'
        }
      }
    },
    user: {
      id: {
        dashed_name: 'process-entry-leader-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.entry_leader.user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-entry-leader-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.entry_leader.user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.entry_leader.user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    working_directory: {
      dashed_name: 'process-entry-leader-working-directory',
      description: 'The working directory of the process.',
      example: '/home/alice',
      flat_name: 'process.entry_leader.working_directory',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.entry_leader.working_directory.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'working_directory',
      normalize: [],
      original_fieldset: 'process',
      short: 'The working directory of the process.',
      type: 'keyword'
    }
  },
  env_vars: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'process-env-vars',
    description: 'Environment variables (`env_vars`) set at the time of the event. May be filtered to protect sensitive information.\n' +
      'The field should not contain nested objects. All values should use `keyword`.',
    example: '{"USER": "elastic","LANG": "en_US.UTF-8","HOME": "/home/elastic"}',
    flat_name: 'process.env_vars',
    level: 'extended',
    name: 'env_vars',
    normalize: [],
    short: 'Environment variables set at the time of the event.',
    type: 'object'
  },
  executable: {
    dashed_name: 'process-executable',
    description: 'Absolute path to the process executable.',
    example: '/usr/bin/ssh',
    flat_name: 'process.executable',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'process.executable.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'executable',
    normalize: [],
    short: 'Absolute path to the process executable.',
    type: 'keyword'
  },
  exit_code: {
    dashed_name: 'process-exit-code',
    description: 'The exit code of the process, if this is a termination event.\n' +
      'The field should be absent if there is no exit code for the event (e.g. process start).',
    example: 137,
    flat_name: 'process.exit_code',
    level: 'extended',
    name: 'exit_code',
    normalize: [],
    short: 'The exit code of the process.',
    type: 'long'
  },
  group_leader: {
    args: {
      dashed_name: 'process-group-leader-args',
      description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
        'May be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
      flat_name: 'process.group_leader.args',
      ignore_above: 1024,
      level: 'extended',
      name: 'args',
      normalize: [ 'array' ],
      original_fieldset: 'process',
      short: 'Array of process arguments.',
      type: 'keyword'
    },
    args_count: {
      dashed_name: 'process-group-leader-args-count',
      description: 'Length of the process.args array.\n' +
        'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
      example: 4,
      flat_name: 'process.group_leader.args_count',
      level: 'extended',
      name: 'args_count',
      normalize: [],
      original_fieldset: 'process',
      short: 'Length of the process.args array.',
      type: 'long'
    },
    command_line: {
      dashed_name: 'process-group-leader-command-line',
      description: 'Full command line that started the process, including the absolute path to the executable, and all arguments.\n' +
        'Some arguments may be filtered to protect sensitive information.',
      example: '/usr/bin/ssh -l user 10.0.0.16',
      flat_name: 'process.group_leader.command_line',
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.group_leader.command_line.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'command_line',
      normalize: [],
      original_fieldset: 'process',
      short: 'Full command line that started the process.',
      type: 'wildcard'
    },
    entity_id: {
      dashed_name: 'process-group-leader-entity-id',
      description: 'Unique identifier for the process.\n' +
        'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
        'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
      example: 'c2c455d9f99375d',
      flat_name: 'process.group_leader.entity_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'entity_id',
      normalize: [],
      original_fieldset: 'process',
      short: 'Unique identifier for the process.',
      type: 'keyword'
    },
    executable: {
      dashed_name: 'process-group-leader-executable',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      flat_name: 'process.group_leader.executable',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.group_leader.executable.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'executable',
      normalize: [],
      original_fieldset: 'process',
      short: 'Absolute path to the process executable.',
      type: 'keyword'
    },
    group: {
      id: {
        dashed_name: 'process-group-leader-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.group_leader.group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-group-name',
        description: 'Name of the group.',
        flat_name: 'process.group_leader.group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    interactive: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-group-leader-interactive',
      description: 'Whether the process is connected to an interactive shell.\n' +
        'Process interactivity is inferred from the processes file descriptors. If the character device for the controlling tty is the same as stdin and stderr for the process, the process is considered interactive.\n' +
        'Note: A non-interactive process can belong to an interactive session and is simply one that does not have open file descriptors reading the controlling TTY on FD 0 (stdin) or writing to the controlling TTY on FD 2 (stderr). A backgrounded process is still considered interactive if stdin and stderr are connected to the controlling TTY.',
      example: true,
      flat_name: 'process.group_leader.interactive',
      level: 'extended',
      name: 'interactive',
      normalize: [],
      original_fieldset: 'process',
      short: 'Whether the process is connected to an interactive shell.',
      type: 'boolean'
    },
    name: {
      dashed_name: 'process-group-leader-name',
      description: 'Process name.\nSometimes called program name or similar.',
      example: 'ssh',
      flat_name: 'process.group_leader.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.group_leader.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process name.',
      type: 'keyword'
    },
    pid: {
      dashed_name: 'process-group-leader-pid',
      description: 'Process id.',
      example: 4242,
      flat_name: 'process.group_leader.pid',
      format: 'string',
      level: 'core',
      name: 'pid',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process id.',
      type: 'long'
    },
    real_group: {
      id: {
        dashed_name: 'process-group-leader-real-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.group_leader.real_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-real-group-name',
        description: 'Name of the group.',
        flat_name: 'process.group_leader.real_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    real_user: {
      id: {
        dashed_name: 'process-group-leader-real-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.group_leader.real_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-real-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.group_leader.real_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.group_leader.real_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    same_as_process: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-group-leader-same-as-process',
      description: 'This boolean is used to identify if a leader process is the same as the top level process.\n' +
        'For example, if `process.group_leader.same_as_process = true`, it means the process event in question is the leader of its process group. Details under `process.*` like `pid` would be the same under `process.group_leader.*` The same applies for both `process.session_leader` and `process.entry_leader`.\n' +
        "This field exists to the benefit of EQL and other rule engines since it's not possible to compare equality between two fields in a single document. e.g `process.entity_id` = `process.group_leader.entity_id` (top level process is the process group leader) OR `process.entity_id` = `process.entry_leader.entity_id` (top level process is the entry session leader)\n" +
        'Instead these rules could be written like: `process.group_leader.same_as_process: true` OR `process.entry_leader.same_as_process: true`\n' +
        'Note: This field is only set on `process.entry_leader`, `process.session_leader` and `process.group_leader`.',
      example: true,
      flat_name: 'process.group_leader.same_as_process',
      level: 'extended',
      name: 'same_as_process',
      normalize: [],
      original_fieldset: 'process',
      short: 'This boolean is used to identify if a leader process is the same as the top level process.',
      type: 'boolean'
    },
    saved_group: {
      id: {
        dashed_name: 'process-group-leader-saved-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.group_leader.saved_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-saved-group-name',
        description: 'Name of the group.',
        flat_name: 'process.group_leader.saved_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    saved_user: {
      id: {
        dashed_name: 'process-group-leader-saved-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.group_leader.saved_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-saved-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.group_leader.saved_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.group_leader.saved_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    start: {
      dashed_name: 'process-group-leader-start',
      description: 'The time the process started.',
      example: '2016-05-23T08:05:34.853Z',
      flat_name: 'process.group_leader.start',
      level: 'extended',
      name: 'start',
      normalize: [],
      original_fieldset: 'process',
      short: 'The time the process started.',
      type: 'date'
    },
    supplemental_groups: {
      id: {
        dashed_name: 'process-group-leader-supplemental-groups-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.group_leader.supplemental_groups.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-supplemental-groups-name',
        description: 'Name of the group.',
        flat_name: 'process.group_leader.supplemental_groups.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    tty: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-group-leader-tty',
      description: 'Information about the controlling TTY device. If set, the process belongs to an interactive session.',
      flat_name: 'process.group_leader.tty',
      level: 'extended',
      name: 'tty',
      normalize: [],
      original_fieldset: 'process',
      short: 'Information about the controlling TTY device.',
      type: 'object',
      char_device: {
        major: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-group-leader-tty-char-device-major',
          description: `The major number identifies the driver associated with the device. The character device's major and minor numbers can be algorithmically combined to produce the more familiar terminal identifiers such as "ttyS0" and "pts/0. For more details, please refer to the Linux kernel documentation.`,
          example: 1,
          flat_name: 'process.group_leader.tty.char_device.major',
          level: 'extended',
          name: 'tty.char_device.major',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's major number.",
          type: 'long'
        },
        minor: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-group-leader-tty-char-device-minor',
          description: 'The minor number is used only by the driver specified by the major number; other parts of the kernel don’t use it, and merely pass it along to the driver. It is common for a driver to control several devices; the minor number provides a way for the driver to differentiate among them.',
          example: 128,
          flat_name: 'process.group_leader.tty.char_device.minor',
          level: 'extended',
          name: 'tty.char_device.minor',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's minor number.",
          type: 'long'
        }
      }
    },
    user: {
      id: {
        dashed_name: 'process-group-leader-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.group_leader.user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-group-leader-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.group_leader.user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.group_leader.user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    working_directory: {
      dashed_name: 'process-group-leader-working-directory',
      description: 'The working directory of the process.',
      example: '/home/alice',
      flat_name: 'process.group_leader.working_directory',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.group_leader.working_directory.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'working_directory',
      normalize: [],
      original_fieldset: 'process',
      short: 'The working directory of the process.',
      type: 'keyword'
    }
  },
  hash: {
    md5: {
      dashed_name: 'process-hash-md5',
      description: 'MD5 hash.',
      flat_name: 'process.hash.md5',
      ignore_above: 1024,
      level: 'extended',
      name: 'md5',
      normalize: [],
      original_fieldset: 'hash',
      short: 'MD5 hash.',
      type: 'keyword'
    },
    sha1: {
      dashed_name: 'process-hash-sha1',
      description: 'SHA1 hash.',
      flat_name: 'process.hash.sha1',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha1',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA1 hash.',
      type: 'keyword'
    },
    sha256: {
      dashed_name: 'process-hash-sha256',
      description: 'SHA256 hash.',
      flat_name: 'process.hash.sha256',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha256',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA256 hash.',
      type: 'keyword'
    },
    sha384: {
      dashed_name: 'process-hash-sha384',
      description: 'SHA384 hash.',
      flat_name: 'process.hash.sha384',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha384',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA384 hash.',
      type: 'keyword'
    },
    sha512: {
      dashed_name: 'process-hash-sha512',
      description: 'SHA512 hash.',
      flat_name: 'process.hash.sha512',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha512',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA512 hash.',
      type: 'keyword'
    },
    ssdeep: {
      dashed_name: 'process-hash-ssdeep',
      description: 'SSDEEP hash.',
      flat_name: 'process.hash.ssdeep',
      ignore_above: 1024,
      level: 'extended',
      name: 'ssdeep',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SSDEEP hash.',
      type: 'keyword'
    },
    tlsh: {
      dashed_name: 'process-hash-tlsh',
      description: 'TLSH hash.',
      flat_name: 'process.hash.tlsh',
      ignore_above: 1024,
      level: 'extended',
      name: 'tlsh',
      normalize: [],
      original_fieldset: 'hash',
      short: 'TLSH hash.',
      type: 'keyword'
    }
  },
  interactive: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'process-interactive',
    description: 'Whether the process is connected to an interactive shell.\n' +
      'Process interactivity is inferred from the processes file descriptors. If the character device for the controlling tty is the same as stdin and stderr for the process, the process is considered interactive.\n' +
      'Note: A non-interactive process can belong to an interactive session and is simply one that does not have open file descriptors reading the controlling TTY on FD 0 (stdin) or writing to the controlling TTY on FD 2 (stderr). A backgrounded process is still considered interactive if stdin and stderr are connected to the controlling TTY.',
    example: true,
    flat_name: 'process.interactive',
    level: 'extended',
    name: 'interactive',
    normalize: [],
    short: 'Whether the process is connected to an interactive shell.',
    type: 'boolean'
  },
  name: {
    dashed_name: 'process-name',
    description: 'Process name.\nSometimes called program name or similar.',
    example: 'ssh',
    flat_name: 'process.name',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'process.name.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'name',
    normalize: [],
    short: 'Process name.',
    type: 'keyword'
  },
  parent: {
    args: {
      dashed_name: 'process-parent-args',
      description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
        'May be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
      flat_name: 'process.parent.args',
      ignore_above: 1024,
      level: 'extended',
      name: 'args',
      normalize: [ 'array' ],
      original_fieldset: 'process',
      short: 'Array of process arguments.',
      type: 'keyword'
    },
    args_count: {
      dashed_name: 'process-parent-args-count',
      description: 'Length of the process.args array.\n' +
        'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
      example: 4,
      flat_name: 'process.parent.args_count',
      level: 'extended',
      name: 'args_count',
      normalize: [],
      original_fieldset: 'process',
      short: 'Length of the process.args array.',
      type: 'long'
    },
    code_signature: {
      digest_algorithm: {
        dashed_name: 'process-parent-code-signature-digest-algorithm',
        description: 'The hashing algorithm used to sign the process.\n' +
          'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
        example: 'sha256',
        flat_name: 'process.parent.code_signature.digest_algorithm',
        ignore_above: 1024,
        level: 'extended',
        name: 'digest_algorithm',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Hashing algorithm used to sign the process.',
        type: 'keyword'
      },
      exists: {
        dashed_name: 'process-parent-code-signature-exists',
        description: 'Boolean to capture if a signature is present.',
        example: 'true',
        flat_name: 'process.parent.code_signature.exists',
        level: 'core',
        name: 'exists',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Boolean to capture if a signature is present.',
        type: 'boolean'
      },
      signing_id: {
        dashed_name: 'process-parent-code-signature-signing-id',
        description: 'The identifier used to sign the process.\n' +
          'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
        example: 'com.apple.xpc.proxy',
        flat_name: 'process.parent.code_signature.signing_id',
        ignore_above: 1024,
        level: 'extended',
        name: 'signing_id',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'The identifier used to sign the process.',
        type: 'keyword'
      },
      status: {
        dashed_name: 'process-parent-code-signature-status',
        description: 'Additional information about the certificate status.\n' +
          'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
        example: 'ERROR_UNTRUSTED_ROOT',
        flat_name: 'process.parent.code_signature.status',
        ignore_above: 1024,
        level: 'extended',
        name: 'status',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Additional information about the certificate status.',
        type: 'keyword'
      },
      subject_name: {
        dashed_name: 'process-parent-code-signature-subject-name',
        description: 'Subject name of the code signer',
        example: 'Microsoft Corporation',
        flat_name: 'process.parent.code_signature.subject_name',
        ignore_above: 1024,
        level: 'core',
        name: 'subject_name',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Subject name of the code signer',
        type: 'keyword'
      },
      team_id: {
        dashed_name: 'process-parent-code-signature-team-id',
        description: 'The team identifier used to sign the process.\n' +
          'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
        example: 'EQHXZ8M8AV',
        flat_name: 'process.parent.code_signature.team_id',
        ignore_above: 1024,
        level: 'extended',
        name: 'team_id',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'The team identifier used to sign the process.',
        type: 'keyword'
      },
      timestamp: {
        dashed_name: 'process-parent-code-signature-timestamp',
        description: 'Date and time when the code signature was generated and signed.',
        example: '2021-01-01T12:10:30Z',
        flat_name: 'process.parent.code_signature.timestamp',
        level: 'extended',
        name: 'timestamp',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'When the signature was generated and signed.',
        type: 'date'
      },
      trusted: {
        dashed_name: 'process-parent-code-signature-trusted',
        description: 'Stores the trust status of the certificate chain.\n' +
          'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
        example: 'true',
        flat_name: 'process.parent.code_signature.trusted',
        level: 'extended',
        name: 'trusted',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Stores the trust status of the certificate chain.',
        type: 'boolean'
      },
      valid: {
        dashed_name: 'process-parent-code-signature-valid',
        description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
          'Leave unpopulated if a certificate was unchecked.',
        example: 'true',
        flat_name: 'process.parent.code_signature.valid',
        level: 'extended',
        name: 'valid',
        normalize: [],
        original_fieldset: 'code_signature',
        short: 'Boolean to capture if the digital signature is verified against the binary content.',
        type: 'boolean'
      }
    },
    command_line: {
      dashed_name: 'process-parent-command-line',
      description: 'Full command line that started the process, including the absolute path to the executable, and all arguments.\n' +
        'Some arguments may be filtered to protect sensitive information.',
      example: '/usr/bin/ssh -l user 10.0.0.16',
      flat_name: 'process.parent.command_line',
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.parent.command_line.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'command_line',
      normalize: [],
      original_fieldset: 'process',
      short: 'Full command line that started the process.',
      type: 'wildcard'
    },
    elf: {
      architecture: {
        dashed_name: 'process-parent-elf-architecture',
        description: 'Machine architecture of the ELF file.',
        example: 'x86-64',
        flat_name: 'process.parent.elf.architecture',
        ignore_above: 1024,
        level: 'extended',
        name: 'architecture',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Machine architecture of the ELF file.',
        type: 'keyword'
      },
      byte_order: {
        dashed_name: 'process-parent-elf-byte-order',
        description: 'Byte sequence of ELF file.',
        example: 'Little Endian',
        flat_name: 'process.parent.elf.byte_order',
        ignore_above: 1024,
        level: 'extended',
        name: 'byte_order',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Byte sequence of ELF file.',
        type: 'keyword'
      },
      cpu_type: {
        dashed_name: 'process-parent-elf-cpu-type',
        description: 'CPU type of the ELF file.',
        example: 'Intel',
        flat_name: 'process.parent.elf.cpu_type',
        ignore_above: 1024,
        level: 'extended',
        name: 'cpu_type',
        normalize: [],
        original_fieldset: 'elf',
        short: 'CPU type of the ELF file.',
        type: 'keyword'
      },
      creation_date: {
        dashed_name: 'process-parent-elf-creation-date',
        description: "Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.",
        flat_name: 'process.parent.elf.creation_date',
        level: 'extended',
        name: 'creation_date',
        normalize: [],
        original_fieldset: 'elf',
        short: 'Build or compile date.',
        type: 'date'
      },
      exports: {
        dashed_name: 'process-parent-elf-exports',
        description: 'List of exported element names and types.',
        flat_name: 'process.parent.elf.exports',
        level: 'extended',
        name: 'exports',
        normalize: [ 'array' ],
        original_fieldset: 'elf',
        short: 'List of exported element names and types.',
        type: 'flattened'
      },
      header: {
        abi_version: {
          dashed_name: 'process-parent-elf-header-abi-version',
          description: 'Version of the ELF Application Binary Interface (ABI).',
          flat_name: 'process.parent.elf.header.abi_version',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.abi_version',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Version of the ELF Application Binary Interface (ABI).',
          type: 'keyword'
        },
        class: {
          dashed_name: 'process-parent-elf-header-class',
          description: 'Header class of the ELF file.',
          flat_name: 'process.parent.elf.header.class',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.class',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Header class of the ELF file.',
          type: 'keyword'
        },
        data: {
          dashed_name: 'process-parent-elf-header-data',
          description: 'Data table of the ELF header.',
          flat_name: 'process.parent.elf.header.data',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.data',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Data table of the ELF header.',
          type: 'keyword'
        },
        entrypoint: {
          dashed_name: 'process-parent-elf-header-entrypoint',
          description: 'Header entrypoint of the ELF file.',
          flat_name: 'process.parent.elf.header.entrypoint',
          format: 'string',
          level: 'extended',
          name: 'header.entrypoint',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Header entrypoint of the ELF file.',
          type: 'long'
        },
        object_version: {
          dashed_name: 'process-parent-elf-header-object-version',
          description: '"0x1" for original ELF files.',
          flat_name: 'process.parent.elf.header.object_version',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.object_version',
          normalize: [],
          original_fieldset: 'elf',
          short: '"0x1" for original ELF files.',
          type: 'keyword'
        },
        os_abi: {
          dashed_name: 'process-parent-elf-header-os-abi',
          description: 'Application Binary Interface (ABI) of the Linux OS.',
          flat_name: 'process.parent.elf.header.os_abi',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.os_abi',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Application Binary Interface (ABI) of the Linux OS.',
          type: 'keyword'
        },
        type: {
          dashed_name: 'process-parent-elf-header-type',
          description: 'Header type of the ELF file.',
          flat_name: 'process.parent.elf.header.type',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.type',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Header type of the ELF file.',
          type: 'keyword'
        },
        version: {
          dashed_name: 'process-parent-elf-header-version',
          description: 'Version of the ELF header.',
          flat_name: 'process.parent.elf.header.version',
          ignore_above: 1024,
          level: 'extended',
          name: 'header.version',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Version of the ELF header.',
          type: 'keyword'
        }
      },
      imports: {
        dashed_name: 'process-parent-elf-imports',
        description: 'List of imported element names and types.',
        flat_name: 'process.parent.elf.imports',
        level: 'extended',
        name: 'imports',
        normalize: [ 'array' ],
        original_fieldset: 'elf',
        short: 'List of imported element names and types.',
        type: 'flattened'
      },
      sections: {
        dashed_name: 'process-parent-elf-sections',
        description: 'An array containing an object for each section of the ELF file.\n' +
          'The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.',
        flat_name: 'process.parent.elf.sections',
        level: 'extended',
        name: {
          dashed_name: 'process-parent-elf-sections-name',
          description: 'ELF Section List name.',
          flat_name: 'process.parent.elf.sections.name',
          ignore_above: 1024,
          level: 'extended',
          name: 'sections.name',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List name.',
          type: 'keyword'
        },
        normalize: [ 'array' ],
        original_fieldset: 'elf',
        short: 'Section information of the ELF file.',
        type: {
          dashed_name: 'process-parent-elf-sections-type',
          description: 'ELF Section List type.',
          flat_name: 'process.parent.elf.sections.type',
          ignore_above: 1024,
          level: 'extended',
          name: 'sections.type',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List type.',
          type: 'keyword'
        },
        chi2: {
          dashed_name: 'process-parent-elf-sections-chi2',
          description: 'Chi-square probability distribution of the section.',
          flat_name: 'process.parent.elf.sections.chi2',
          format: 'number',
          level: 'extended',
          name: 'sections.chi2',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Chi-square probability distribution of the section.',
          type: 'long'
        },
        entropy: {
          dashed_name: 'process-parent-elf-sections-entropy',
          description: 'Shannon entropy calculation from the section.',
          flat_name: 'process.parent.elf.sections.entropy',
          format: 'number',
          level: 'extended',
          name: 'sections.entropy',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Shannon entropy calculation from the section.',
          type: 'long'
        },
        flags: {
          dashed_name: 'process-parent-elf-sections-flags',
          description: 'ELF Section List flags.',
          flat_name: 'process.parent.elf.sections.flags',
          ignore_above: 1024,
          level: 'extended',
          name: 'sections.flags',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List flags.',
          type: 'keyword'
        },
        physical_offset: {
          dashed_name: 'process-parent-elf-sections-physical-offset',
          description: 'ELF Section List offset.',
          flat_name: 'process.parent.elf.sections.physical_offset',
          ignore_above: 1024,
          level: 'extended',
          name: 'sections.physical_offset',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List offset.',
          type: 'keyword'
        },
        physical_size: {
          dashed_name: 'process-parent-elf-sections-physical-size',
          description: 'ELF Section List physical size.',
          flat_name: 'process.parent.elf.sections.physical_size',
          format: 'bytes',
          level: 'extended',
          name: 'sections.physical_size',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List physical size.',
          type: 'long'
        },
        virtual_address: {
          dashed_name: 'process-parent-elf-sections-virtual-address',
          description: 'ELF Section List virtual address.',
          flat_name: 'process.parent.elf.sections.virtual_address',
          format: 'string',
          level: 'extended',
          name: 'sections.virtual_address',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List virtual address.',
          type: 'long'
        },
        virtual_size: {
          dashed_name: 'process-parent-elf-sections-virtual-size',
          description: 'ELF Section List virtual size.',
          flat_name: 'process.parent.elf.sections.virtual_size',
          format: 'string',
          level: 'extended',
          name: 'sections.virtual_size',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF Section List virtual size.',
          type: 'long'
        }
      },
      segments: {
        dashed_name: 'process-parent-elf-segments',
        description: 'An array containing an object for each segment of the ELF file.\n' +
          'The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.',
        flat_name: 'process.parent.elf.segments',
        level: 'extended',
        name: 'segments',
        normalize: [ 'array' ],
        original_fieldset: 'elf',
        short: 'ELF object segment list.',
        type: {
          dashed_name: 'process-parent-elf-segments-type',
          description: 'ELF object segment type.',
          flat_name: 'process.parent.elf.segments.type',
          ignore_above: 1024,
          level: 'extended',
          name: 'segments.type',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF object segment type.',
          type: 'keyword'
        },
        sections: {
          dashed_name: 'process-parent-elf-segments-sections',
          description: 'ELF object segment sections.',
          flat_name: 'process.parent.elf.segments.sections',
          ignore_above: 1024,
          level: 'extended',
          name: 'segments.sections',
          normalize: [],
          original_fieldset: 'elf',
          short: 'ELF object segment sections.',
          type: 'keyword'
        }
      },
      shared_libraries: {
        dashed_name: 'process-parent-elf-shared-libraries',
        description: 'List of shared libraries used by this ELF object.',
        flat_name: 'process.parent.elf.shared_libraries',
        ignore_above: 1024,
        level: 'extended',
        name: 'shared_libraries',
        normalize: [ 'array' ],
        original_fieldset: 'elf',
        short: 'List of shared libraries used by this ELF object.',
        type: 'keyword'
      },
      telfhash: {
        dashed_name: 'process-parent-elf-telfhash',
        description: 'telfhash symbol hash for ELF file.',
        flat_name: 'process.parent.elf.telfhash',
        ignore_above: 1024,
        level: 'extended',
        name: 'telfhash',
        normalize: [],
        original_fieldset: 'elf',
        short: 'telfhash hash for ELF file.',
        type: 'keyword'
      }
    },
    end: {
      dashed_name: 'process-parent-end',
      description: 'The time the process ended.',
      example: '2016-05-23T08:05:34.853Z',
      flat_name: 'process.parent.end',
      level: 'extended',
      name: 'end',
      normalize: [],
      original_fieldset: 'process',
      short: 'The time the process ended.',
      type: 'date'
    },
    entity_id: {
      dashed_name: 'process-parent-entity-id',
      description: 'Unique identifier for the process.\n' +
        'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
        'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
      example: 'c2c455d9f99375d',
      flat_name: 'process.parent.entity_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'entity_id',
      normalize: [],
      original_fieldset: 'process',
      short: 'Unique identifier for the process.',
      type: 'keyword'
    },
    executable: {
      dashed_name: 'process-parent-executable',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      flat_name: 'process.parent.executable',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.parent.executable.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'executable',
      normalize: [],
      original_fieldset: 'process',
      short: 'Absolute path to the process executable.',
      type: 'keyword'
    },
    exit_code: {
      dashed_name: 'process-parent-exit-code',
      description: 'The exit code of the process, if this is a termination event.\n' +
        'The field should be absent if there is no exit code for the event (e.g. process start).',
      example: 137,
      flat_name: 'process.parent.exit_code',
      level: 'extended',
      name: 'exit_code',
      normalize: [],
      original_fieldset: 'process',
      short: 'The exit code of the process.',
      type: 'long'
    },
    group: {
      id: {
        dashed_name: 'process-parent-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.parent.group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-group-name',
        description: 'Name of the group.',
        flat_name: 'process.parent.group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    group_leader: {
      entity_id: {
        dashed_name: 'process-parent-group-leader-entity-id',
        description: 'Unique identifier for the process.\n' +
          'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
          'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
        example: 'c2c455d9f99375d',
        flat_name: 'process.parent.group_leader.entity_id',
        ignore_above: 1024,
        level: 'extended',
        name: 'entity_id',
        normalize: [],
        original_fieldset: 'process',
        short: 'Unique identifier for the process.',
        type: 'keyword'
      },
      pid: {
        dashed_name: 'process-parent-group-leader-pid',
        description: 'Process id.',
        example: 4242,
        flat_name: 'process.parent.group_leader.pid',
        format: 'string',
        level: 'core',
        name: 'pid',
        normalize: [],
        original_fieldset: 'process',
        short: 'Process id.',
        type: 'long'
      },
      start: {
        dashed_name: 'process-parent-group-leader-start',
        description: 'The time the process started.',
        example: '2016-05-23T08:05:34.853Z',
        flat_name: 'process.parent.group_leader.start',
        level: 'extended',
        name: 'start',
        normalize: [],
        original_fieldset: 'process',
        short: 'The time the process started.',
        type: 'date'
      }
    },
    hash: {
      md5: {
        dashed_name: 'process-parent-hash-md5',
        description: 'MD5 hash.',
        flat_name: 'process.parent.hash.md5',
        ignore_above: 1024,
        level: 'extended',
        name: 'md5',
        normalize: [],
        original_fieldset: 'hash',
        short: 'MD5 hash.',
        type: 'keyword'
      },
      sha1: {
        dashed_name: 'process-parent-hash-sha1',
        description: 'SHA1 hash.',
        flat_name: 'process.parent.hash.sha1',
        ignore_above: 1024,
        level: 'extended',
        name: 'sha1',
        normalize: [],
        original_fieldset: 'hash',
        short: 'SHA1 hash.',
        type: 'keyword'
      },
      sha256: {
        dashed_name: 'process-parent-hash-sha256',
        description: 'SHA256 hash.',
        flat_name: 'process.parent.hash.sha256',
        ignore_above: 1024,
        level: 'extended',
        name: 'sha256',
        normalize: [],
        original_fieldset: 'hash',
        short: 'SHA256 hash.',
        type: 'keyword'
      },
      sha384: {
        dashed_name: 'process-parent-hash-sha384',
        description: 'SHA384 hash.',
        flat_name: 'process.parent.hash.sha384',
        ignore_above: 1024,
        level: 'extended',
        name: 'sha384',
        normalize: [],
        original_fieldset: 'hash',
        short: 'SHA384 hash.',
        type: 'keyword'
      },
      sha512: {
        dashed_name: 'process-parent-hash-sha512',
        description: 'SHA512 hash.',
        flat_name: 'process.parent.hash.sha512',
        ignore_above: 1024,
        level: 'extended',
        name: 'sha512',
        normalize: [],
        original_fieldset: 'hash',
        short: 'SHA512 hash.',
        type: 'keyword'
      },
      ssdeep: {
        dashed_name: 'process-parent-hash-ssdeep',
        description: 'SSDEEP hash.',
        flat_name: 'process.parent.hash.ssdeep',
        ignore_above: 1024,
        level: 'extended',
        name: 'ssdeep',
        normalize: [],
        original_fieldset: 'hash',
        short: 'SSDEEP hash.',
        type: 'keyword'
      },
      tlsh: {
        dashed_name: 'process-parent-hash-tlsh',
        description: 'TLSH hash.',
        flat_name: 'process.parent.hash.tlsh',
        ignore_above: 1024,
        level: 'extended',
        name: 'tlsh',
        normalize: [],
        original_fieldset: 'hash',
        short: 'TLSH hash.',
        type: 'keyword'
      }
    },
    interactive: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-parent-interactive',
      description: 'Whether the process is connected to an interactive shell.\n' +
        'Process interactivity is inferred from the processes file descriptors. If the character device for the controlling tty is the same as stdin and stderr for the process, the process is considered interactive.\n' +
        'Note: A non-interactive process can belong to an interactive session and is simply one that does not have open file descriptors reading the controlling TTY on FD 0 (stdin) or writing to the controlling TTY on FD 2 (stderr). A backgrounded process is still considered interactive if stdin and stderr are connected to the controlling TTY.',
      example: true,
      flat_name: 'process.parent.interactive',
      level: 'extended',
      name: 'interactive',
      normalize: [],
      original_fieldset: 'process',
      short: 'Whether the process is connected to an interactive shell.',
      type: 'boolean'
    },
    name: {
      dashed_name: 'process-parent-name',
      description: 'Process name.\nSometimes called program name or similar.',
      example: 'ssh',
      flat_name: 'process.parent.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.parent.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process name.',
      type: 'keyword'
    },
    pe: {
      architecture: {
        dashed_name: 'process-parent-pe-architecture',
        description: 'CPU architecture target for the file.',
        example: 'x64',
        flat_name: 'process.parent.pe.architecture',
        ignore_above: 1024,
        level: 'extended',
        name: 'architecture',
        normalize: [],
        original_fieldset: 'pe',
        short: 'CPU architecture target for the file.',
        type: 'keyword'
      },
      company: {
        dashed_name: 'process-parent-pe-company',
        description: 'Internal company name of the file, provided at compile-time.',
        example: 'Microsoft Corporation',
        flat_name: 'process.parent.pe.company',
        ignore_above: 1024,
        level: 'extended',
        name: 'company',
        normalize: [],
        original_fieldset: 'pe',
        short: 'Internal company name of the file, provided at compile-time.',
        type: 'keyword'
      },
      description: {
        dashed_name: 'process-parent-pe-description',
        description: 'Internal description of the file, provided at compile-time.',
        example: 'Paint',
        flat_name: 'process.parent.pe.description',
        ignore_above: 1024,
        level: 'extended',
        name: 'description',
        normalize: [],
        original_fieldset: 'pe',
        short: 'Internal description of the file, provided at compile-time.',
        type: 'keyword'
      },
      file_version: {
        dashed_name: 'process-parent-pe-file-version',
        description: 'Internal version of the file, provided at compile-time.',
        example: '6.3.9600.17415',
        flat_name: 'process.parent.pe.file_version',
        ignore_above: 1024,
        level: 'extended',
        name: 'file_version',
        normalize: [],
        original_fieldset: 'pe',
        short: 'Process name.',
        type: 'keyword'
      },
      imphash: {
        dashed_name: 'process-parent-pe-imphash',
        description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
          'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
        example: '0c6803c4e922103c4dca5963aad36ddf',
        flat_name: 'process.parent.pe.imphash',
        ignore_above: 1024,
        level: 'extended',
        name: 'imphash',
        normalize: [],
        original_fieldset: 'pe',
        short: 'A hash of the imports in a PE file.',
        type: 'keyword'
      },
      original_file_name: {
        dashed_name: 'process-parent-pe-original-file-name',
        description: 'Internal name of the file, provided at compile-time.',
        example: 'MSPAINT.EXE',
        flat_name: 'process.parent.pe.original_file_name',
        ignore_above: 1024,
        level: 'extended',
        name: 'original_file_name',
        normalize: [],
        original_fieldset: 'pe',
        short: 'Internal name of the file, provided at compile-time.',
        type: 'keyword'
      },
      pehash: {
        dashed_name: 'process-parent-pe-pehash',
        description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
          'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
        example: '73ff189b63cd6be375a7ff25179a38d347651975',
        flat_name: 'process.parent.pe.pehash',
        ignore_above: 1024,
        level: 'extended',
        name: 'pehash',
        normalize: [],
        original_fieldset: 'pe',
        short: 'A hash of the PE header and data from one or more PE sections.',
        type: 'keyword'
      },
      product: {
        dashed_name: 'process-parent-pe-product',
        description: 'Internal product name of the file, provided at compile-time.',
        example: 'Microsoft® Windows® Operating System',
        flat_name: 'process.parent.pe.product',
        ignore_above: 1024,
        level: 'extended',
        name: 'product',
        normalize: [],
        original_fieldset: 'pe',
        short: 'Internal product name of the file, provided at compile-time.',
        type: 'keyword'
      }
    },
    pgid: {
      dashed_name: 'process-parent-pgid',
      description: 'Deprecated for removal in next major version release. This field is superseded by `process.group_leader.pid`.\n' +
        'Identifier of the group of processes the process belongs to.',
      flat_name: 'process.parent.pgid',
      format: 'string',
      level: 'extended',
      name: 'pgid',
      normalize: [],
      original_fieldset: 'process',
      short: 'Deprecated identifier of the group of processes the process belongs to.',
      type: 'long'
    },
    pid: {
      dashed_name: 'process-parent-pid',
      description: 'Process id.',
      example: 4242,
      flat_name: 'process.parent.pid',
      format: 'string',
      level: 'core',
      name: 'pid',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process id.',
      type: 'long'
    },
    real_group: {
      id: {
        dashed_name: 'process-parent-real-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.parent.real_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-real-group-name',
        description: 'Name of the group.',
        flat_name: 'process.parent.real_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    real_user: {
      id: {
        dashed_name: 'process-parent-real-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.parent.real_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-real-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.parent.real_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.parent.real_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    saved_group: {
      id: {
        dashed_name: 'process-parent-saved-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.parent.saved_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-saved-group-name',
        description: 'Name of the group.',
        flat_name: 'process.parent.saved_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    saved_user: {
      id: {
        dashed_name: 'process-parent-saved-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.parent.saved_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-saved-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.parent.saved_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.parent.saved_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    start: {
      dashed_name: 'process-parent-start',
      description: 'The time the process started.',
      example: '2016-05-23T08:05:34.853Z',
      flat_name: 'process.parent.start',
      level: 'extended',
      name: 'start',
      normalize: [],
      original_fieldset: 'process',
      short: 'The time the process started.',
      type: 'date'
    },
    supplemental_groups: {
      id: {
        dashed_name: 'process-parent-supplemental-groups-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.parent.supplemental_groups.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-supplemental-groups-name',
        description: 'Name of the group.',
        flat_name: 'process.parent.supplemental_groups.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    thread: {
      id: {
        dashed_name: 'process-parent-thread-id',
        description: 'Thread ID.',
        example: 4242,
        flat_name: 'process.parent.thread.id',
        format: 'string',
        level: 'extended',
        name: 'thread.id',
        normalize: [],
        original_fieldset: 'process',
        short: 'Thread ID.',
        type: 'long'
      },
      name: {
        dashed_name: 'process-parent-thread-name',
        description: 'Thread name.',
        example: 'thread-0',
        flat_name: 'process.parent.thread.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'thread.name',
        normalize: [],
        original_fieldset: 'process',
        short: 'Thread name.',
        type: 'keyword'
      }
    },
    title: {
      dashed_name: 'process-parent-title',
      description: 'Process title.\n' +
        'The proctitle, some times the same as process name. Can also be different: for example a browser setting its title to the web page currently opened.',
      flat_name: 'process.parent.title',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.parent.title.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'title',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process title.',
      type: 'keyword'
    },
    tty: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-parent-tty',
      description: 'Information about the controlling TTY device. If set, the process belongs to an interactive session.',
      flat_name: 'process.parent.tty',
      level: 'extended',
      name: 'tty',
      normalize: [],
      original_fieldset: 'process',
      short: 'Information about the controlling TTY device.',
      type: 'object',
      char_device: {
        major: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-parent-tty-char-device-major',
          description: `The major number identifies the driver associated with the device. The character device's major and minor numbers can be algorithmically combined to produce the more familiar terminal identifiers such as "ttyS0" and "pts/0. For more details, please refer to the Linux kernel documentation.`,
          example: 1,
          flat_name: 'process.parent.tty.char_device.major',
          level: 'extended',
          name: 'tty.char_device.major',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's major number.",
          type: 'long'
        },
        minor: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-parent-tty-char-device-minor',
          description: 'The minor number is used only by the driver specified by the major number; other parts of the kernel don’t use it, and merely pass it along to the driver. It is common for a driver to control several devices; the minor number provides a way for the driver to differentiate among them.',
          example: 128,
          flat_name: 'process.parent.tty.char_device.minor',
          level: 'extended',
          name: 'tty.char_device.minor',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's minor number.",
          type: 'long'
        }
      }
    },
    uptime: {
      dashed_name: 'process-parent-uptime',
      description: 'Seconds the process has been up.',
      example: 1325,
      flat_name: 'process.parent.uptime',
      level: 'extended',
      name: 'uptime',
      normalize: [],
      original_fieldset: 'process',
      short: 'Seconds the process has been up.',
      type: 'long'
    },
    user: {
      id: {
        dashed_name: 'process-parent-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.parent.user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-parent-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.parent.user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.parent.user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    working_directory: {
      dashed_name: 'process-parent-working-directory',
      description: 'The working directory of the process.',
      example: '/home/alice',
      flat_name: 'process.parent.working_directory',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.parent.working_directory.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'working_directory',
      normalize: [],
      original_fieldset: 'process',
      short: 'The working directory of the process.',
      type: 'keyword'
    }
  },
  pe: {
    architecture: {
      dashed_name: 'process-pe-architecture',
      description: 'CPU architecture target for the file.',
      example: 'x64',
      flat_name: 'process.pe.architecture',
      ignore_above: 1024,
      level: 'extended',
      name: 'architecture',
      normalize: [],
      original_fieldset: 'pe',
      short: 'CPU architecture target for the file.',
      type: 'keyword'
    },
    company: {
      dashed_name: 'process-pe-company',
      description: 'Internal company name of the file, provided at compile-time.',
      example: 'Microsoft Corporation',
      flat_name: 'process.pe.company',
      ignore_above: 1024,
      level: 'extended',
      name: 'company',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal company name of the file, provided at compile-time.',
      type: 'keyword'
    },
    description: {
      dashed_name: 'process-pe-description',
      description: 'Internal description of the file, provided at compile-time.',
      example: 'Paint',
      flat_name: 'process.pe.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'description',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal description of the file, provided at compile-time.',
      type: 'keyword'
    },
    file_version: {
      dashed_name: 'process-pe-file-version',
      description: 'Internal version of the file, provided at compile-time.',
      example: '6.3.9600.17415',
      flat_name: 'process.pe.file_version',
      ignore_above: 1024,
      level: 'extended',
      name: 'file_version',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Process name.',
      type: 'keyword'
    },
    imphash: {
      dashed_name: 'process-pe-imphash',
      description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
        'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
      example: '0c6803c4e922103c4dca5963aad36ddf',
      flat_name: 'process.pe.imphash',
      ignore_above: 1024,
      level: 'extended',
      name: 'imphash',
      normalize: [],
      original_fieldset: 'pe',
      short: 'A hash of the imports in a PE file.',
      type: 'keyword'
    },
    original_file_name: {
      dashed_name: 'process-pe-original-file-name',
      description: 'Internal name of the file, provided at compile-time.',
      example: 'MSPAINT.EXE',
      flat_name: 'process.pe.original_file_name',
      ignore_above: 1024,
      level: 'extended',
      name: 'original_file_name',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal name of the file, provided at compile-time.',
      type: 'keyword'
    },
    pehash: {
      dashed_name: 'process-pe-pehash',
      description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
        'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
      example: '73ff189b63cd6be375a7ff25179a38d347651975',
      flat_name: 'process.pe.pehash',
      ignore_above: 1024,
      level: 'extended',
      name: 'pehash',
      normalize: [],
      original_fieldset: 'pe',
      short: 'A hash of the PE header and data from one or more PE sections.',
      type: 'keyword'
    },
    product: {
      dashed_name: 'process-pe-product',
      description: 'Internal product name of the file, provided at compile-time.',
      example: 'Microsoft® Windows® Operating System',
      flat_name: 'process.pe.product',
      ignore_above: 1024,
      level: 'extended',
      name: 'product',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal product name of the file, provided at compile-time.',
      type: 'keyword'
    }
  },
  pgid: {
    dashed_name: 'process-pgid',
    description: 'Deprecated for removal in next major version release. This field is superseded by `process.group_leader.pid`.\n' +
      'Identifier of the group of processes the process belongs to.',
    flat_name: 'process.pgid',
    format: 'string',
    level: 'extended',
    name: 'pgid',
    normalize: [],
    short: 'Deprecated identifier of the group of processes the process belongs to.',
    type: 'long'
  },
  pid: {
    dashed_name: 'process-pid',
    description: 'Process id.',
    example: 4242,
    flat_name: 'process.pid',
    format: 'string',
    level: 'core',
    name: 'pid',
    normalize: [],
    short: 'Process id.',
    type: 'long'
  },
  previous: {
    args: {
      dashed_name: 'process-previous-args',
      description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
        'May be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
      flat_name: 'process.previous.args',
      ignore_above: 1024,
      level: 'extended',
      name: 'args',
      normalize: [ 'array' ],
      original_fieldset: 'process',
      short: 'Array of process arguments.',
      type: 'keyword'
    },
    args_count: {
      dashed_name: 'process-previous-args-count',
      description: 'Length of the process.args array.\n' +
        'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
      example: 4,
      flat_name: 'process.previous.args_count',
      level: 'extended',
      name: 'args_count',
      normalize: [],
      original_fieldset: 'process',
      short: 'Length of the process.args array.',
      type: 'long'
    },
    executable: {
      dashed_name: 'process-previous-executable',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      flat_name: 'process.previous.executable',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.previous.executable.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'executable',
      normalize: [],
      original_fieldset: 'process',
      short: 'Absolute path to the process executable.',
      type: 'keyword'
    }
  },
  real_group: {
    id: {
      dashed_name: 'process-real-group-id',
      description: 'Unique identifier for the group on the system/platform.',
      flat_name: 'process.real_group.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'id',
      normalize: [],
      original_fieldset: 'group',
      short: 'Unique identifier for the group on the system/platform.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-real-group-name',
      description: 'Name of the group.',
      flat_name: 'process.real_group.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'group',
      short: 'Name of the group.',
      type: 'keyword'
    }
  },
  real_user: {
    id: {
      dashed_name: 'process-real-user-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'process.real_user.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-real-user-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'process.real_user.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [
        {
          flat_name: 'process.real_user.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    }
  },
  saved_group: {
    id: {
      dashed_name: 'process-saved-group-id',
      description: 'Unique identifier for the group on the system/platform.',
      flat_name: 'process.saved_group.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'id',
      normalize: [],
      original_fieldset: 'group',
      short: 'Unique identifier for the group on the system/platform.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-saved-group-name',
      description: 'Name of the group.',
      flat_name: 'process.saved_group.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'group',
      short: 'Name of the group.',
      type: 'keyword'
    }
  },
  saved_user: {
    id: {
      dashed_name: 'process-saved-user-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'process.saved_user.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-saved-user-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'process.saved_user.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [
        {
          flat_name: 'process.saved_user.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    }
  },
  session_leader: {
    args: {
      dashed_name: 'process-session-leader-args',
      description: 'Array of process arguments, starting with the absolute path to the executable.\n' +
        'May be filtered to protect sensitive information.',
      example: '["/usr/bin/ssh", "-l", "user", "10.0.0.16"]',
      flat_name: 'process.session_leader.args',
      ignore_above: 1024,
      level: 'extended',
      name: 'args',
      normalize: [ 'array' ],
      original_fieldset: 'process',
      short: 'Array of process arguments.',
      type: 'keyword'
    },
    args_count: {
      dashed_name: 'process-session-leader-args-count',
      description: 'Length of the process.args array.\n' +
        'This field can be useful for querying or performing bucket analysis on how many arguments were provided to start a process. More arguments may be an indication of suspicious activity.',
      example: 4,
      flat_name: 'process.session_leader.args_count',
      level: 'extended',
      name: 'args_count',
      normalize: [],
      original_fieldset: 'process',
      short: 'Length of the process.args array.',
      type: 'long'
    },
    command_line: {
      dashed_name: 'process-session-leader-command-line',
      description: 'Full command line that started the process, including the absolute path to the executable, and all arguments.\n' +
        'Some arguments may be filtered to protect sensitive information.',
      example: '/usr/bin/ssh -l user 10.0.0.16',
      flat_name: 'process.session_leader.command_line',
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.session_leader.command_line.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'command_line',
      normalize: [],
      original_fieldset: 'process',
      short: 'Full command line that started the process.',
      type: 'wildcard'
    },
    entity_id: {
      dashed_name: 'process-session-leader-entity-id',
      description: 'Unique identifier for the process.\n' +
        'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
        'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
      example: 'c2c455d9f99375d',
      flat_name: 'process.session_leader.entity_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'entity_id',
      normalize: [],
      original_fieldset: 'process',
      short: 'Unique identifier for the process.',
      type: 'keyword'
    },
    executable: {
      dashed_name: 'process-session-leader-executable',
      description: 'Absolute path to the process executable.',
      example: '/usr/bin/ssh',
      flat_name: 'process.session_leader.executable',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.session_leader.executable.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'executable',
      normalize: [],
      original_fieldset: 'process',
      short: 'Absolute path to the process executable.',
      type: 'keyword'
    },
    group: {
      id: {
        dashed_name: 'process-session-leader-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.session_leader.group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-group-name',
        description: 'Name of the group.',
        flat_name: 'process.session_leader.group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    interactive: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-session-leader-interactive',
      description: 'Whether the process is connected to an interactive shell.\n' +
        'Process interactivity is inferred from the processes file descriptors. If the character device for the controlling tty is the same as stdin and stderr for the process, the process is considered interactive.\n' +
        'Note: A non-interactive process can belong to an interactive session and is simply one that does not have open file descriptors reading the controlling TTY on FD 0 (stdin) or writing to the controlling TTY on FD 2 (stderr). A backgrounded process is still considered interactive if stdin and stderr are connected to the controlling TTY.',
      example: true,
      flat_name: 'process.session_leader.interactive',
      level: 'extended',
      name: 'interactive',
      normalize: [],
      original_fieldset: 'process',
      short: 'Whether the process is connected to an interactive shell.',
      type: 'boolean'
    },
    name: {
      dashed_name: 'process-session-leader-name',
      description: 'Process name.\nSometimes called program name or similar.',
      example: 'ssh',
      flat_name: 'process.session_leader.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.session_leader.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process name.',
      type: 'keyword'
    },
    parent: {
      entity_id: {
        dashed_name: 'process-session-leader-parent-entity-id',
        description: 'Unique identifier for the process.\n' +
          'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
          'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
        example: 'c2c455d9f99375d',
        flat_name: 'process.session_leader.parent.entity_id',
        ignore_above: 1024,
        level: 'extended',
        name: 'entity_id',
        normalize: [],
        original_fieldset: 'process',
        short: 'Unique identifier for the process.',
        type: 'keyword'
      },
      pid: {
        dashed_name: 'process-session-leader-parent-pid',
        description: 'Process id.',
        example: 4242,
        flat_name: 'process.session_leader.parent.pid',
        format: 'string',
        level: 'core',
        name: 'pid',
        normalize: [],
        original_fieldset: 'process',
        short: 'Process id.',
        type: 'long'
      },
      session_leader: {
        entity_id: {
          dashed_name: 'process-session-leader-parent-session-leader-entity-id',
          description: 'Unique identifier for the process.\n' +
            'The implementation of this is specified by the data source, but some examples of what could be used here are a process-generated UUID, Sysmon Process GUIDs, or a hash of some uniquely identifying components of a process.\n' +
            'Constructing a globally unique identifier is a common practice to mitigate PID reuse as well as to identify a specific process over time, across multiple monitored hosts.',
          example: 'c2c455d9f99375d',
          flat_name: 'process.session_leader.parent.session_leader.entity_id',
          ignore_above: 1024,
          level: 'extended',
          name: 'entity_id',
          normalize: [],
          original_fieldset: 'process',
          short: 'Unique identifier for the process.',
          type: 'keyword'
        },
        pid: {
          dashed_name: 'process-session-leader-parent-session-leader-pid',
          description: 'Process id.',
          example: 4242,
          flat_name: 'process.session_leader.parent.session_leader.pid',
          format: 'string',
          level: 'core',
          name: 'pid',
          normalize: [],
          original_fieldset: 'process',
          short: 'Process id.',
          type: 'long'
        },
        start: {
          dashed_name: 'process-session-leader-parent-session-leader-start',
          description: 'The time the process started.',
          example: '2016-05-23T08:05:34.853Z',
          flat_name: 'process.session_leader.parent.session_leader.start',
          level: 'extended',
          name: 'start',
          normalize: [],
          original_fieldset: 'process',
          short: 'The time the process started.',
          type: 'date'
        }
      },
      start: {
        dashed_name: 'process-session-leader-parent-start',
        description: 'The time the process started.',
        example: '2016-05-23T08:05:34.853Z',
        flat_name: 'process.session_leader.parent.start',
        level: 'extended',
        name: 'start',
        normalize: [],
        original_fieldset: 'process',
        short: 'The time the process started.',
        type: 'date'
      }
    },
    pid: {
      dashed_name: 'process-session-leader-pid',
      description: 'Process id.',
      example: 4242,
      flat_name: 'process.session_leader.pid',
      format: 'string',
      level: 'core',
      name: 'pid',
      normalize: [],
      original_fieldset: 'process',
      short: 'Process id.',
      type: 'long'
    },
    real_group: {
      id: {
        dashed_name: 'process-session-leader-real-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.session_leader.real_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-real-group-name',
        description: 'Name of the group.',
        flat_name: 'process.session_leader.real_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    real_user: {
      id: {
        dashed_name: 'process-session-leader-real-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.session_leader.real_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-real-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.session_leader.real_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.session_leader.real_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    same_as_process: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-session-leader-same-as-process',
      description: 'This boolean is used to identify if a leader process is the same as the top level process.\n' +
        'For example, if `process.group_leader.same_as_process = true`, it means the process event in question is the leader of its process group. Details under `process.*` like `pid` would be the same under `process.group_leader.*` The same applies for both `process.session_leader` and `process.entry_leader`.\n' +
        "This field exists to the benefit of EQL and other rule engines since it's not possible to compare equality between two fields in a single document. e.g `process.entity_id` = `process.group_leader.entity_id` (top level process is the process group leader) OR `process.entity_id` = `process.entry_leader.entity_id` (top level process is the entry session leader)\n" +
        'Instead these rules could be written like: `process.group_leader.same_as_process: true` OR `process.entry_leader.same_as_process: true`\n' +
        'Note: This field is only set on `process.entry_leader`, `process.session_leader` and `process.group_leader`.',
      example: true,
      flat_name: 'process.session_leader.same_as_process',
      level: 'extended',
      name: 'same_as_process',
      normalize: [],
      original_fieldset: 'process',
      short: 'This boolean is used to identify if a leader process is the same as the top level process.',
      type: 'boolean'
    },
    saved_group: {
      id: {
        dashed_name: 'process-session-leader-saved-group-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.session_leader.saved_group.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-saved-group-name',
        description: 'Name of the group.',
        flat_name: 'process.session_leader.saved_group.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    saved_user: {
      id: {
        dashed_name: 'process-session-leader-saved-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.session_leader.saved_user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-saved-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.session_leader.saved_user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.session_leader.saved_user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    start: {
      dashed_name: 'process-session-leader-start',
      description: 'The time the process started.',
      example: '2016-05-23T08:05:34.853Z',
      flat_name: 'process.session_leader.start',
      level: 'extended',
      name: 'start',
      normalize: [],
      original_fieldset: 'process',
      short: 'The time the process started.',
      type: 'date'
    },
    supplemental_groups: {
      id: {
        dashed_name: 'process-session-leader-supplemental-groups-id',
        description: 'Unique identifier for the group on the system/platform.',
        flat_name: 'process.session_leader.supplemental_groups.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'id',
        normalize: [],
        original_fieldset: 'group',
        short: 'Unique identifier for the group on the system/platform.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-supplemental-groups-name',
        description: 'Name of the group.',
        flat_name: 'process.session_leader.supplemental_groups.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'group',
        short: 'Name of the group.',
        type: 'keyword'
      }
    },
    tty: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'process-session-leader-tty',
      description: 'Information about the controlling TTY device. If set, the process belongs to an interactive session.',
      flat_name: 'process.session_leader.tty',
      level: 'extended',
      name: 'tty',
      normalize: [],
      original_fieldset: 'process',
      short: 'Information about the controlling TTY device.',
      type: 'object',
      char_device: {
        major: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-session-leader-tty-char-device-major',
          description: `The major number identifies the driver associated with the device. The character device's major and minor numbers can be algorithmically combined to produce the more familiar terminal identifiers such as "ttyS0" and "pts/0. For more details, please refer to the Linux kernel documentation.`,
          example: 1,
          flat_name: 'process.session_leader.tty.char_device.major',
          level: 'extended',
          name: 'tty.char_device.major',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's major number.",
          type: 'long'
        },
        minor: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'process-session-leader-tty-char-device-minor',
          description: 'The minor number is used only by the driver specified by the major number; other parts of the kernel don’t use it, and merely pass it along to the driver. It is common for a driver to control several devices; the minor number provides a way for the driver to differentiate among them.',
          example: 128,
          flat_name: 'process.session_leader.tty.char_device.minor',
          level: 'extended',
          name: 'tty.char_device.minor',
          normalize: [],
          original_fieldset: 'process',
          short: "The TTY character device's minor number.",
          type: 'long'
        }
      }
    },
    user: {
      id: {
        dashed_name: 'process-session-leader-user-id',
        description: 'Unique identifier of the user.',
        example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
        flat_name: 'process.session_leader.user.id',
        ignore_above: 1024,
        level: 'core',
        name: 'id',
        normalize: [],
        original_fieldset: 'user',
        short: 'Unique identifier of the user.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'process-session-leader-user-name',
        description: 'Short name or login of the user.',
        example: 'a.einstein',
        flat_name: 'process.session_leader.user.name',
        ignore_above: 1024,
        level: 'core',
        multi_fields: [
          {
            flat_name: 'process.session_leader.user.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'name',
        normalize: [],
        original_fieldset: 'user',
        short: 'Short name or login of the user.',
        type: 'keyword'
      }
    },
    working_directory: {
      dashed_name: 'process-session-leader-working-directory',
      description: 'The working directory of the process.',
      example: '/home/alice',
      flat_name: 'process.session_leader.working_directory',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'process.session_leader.working_directory.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'working_directory',
      normalize: [],
      original_fieldset: 'process',
      short: 'The working directory of the process.',
      type: 'keyword'
    }
  },
  start: {
    dashed_name: 'process-start',
    description: 'The time the process started.',
    example: '2016-05-23T08:05:34.853Z',
    flat_name: 'process.start',
    level: 'extended',
    name: 'start',
    normalize: [],
    short: 'The time the process started.',
    type: 'date'
  },
  supplemental_groups: {
    id: {
      dashed_name: 'process-supplemental-groups-id',
      description: 'Unique identifier for the group on the system/platform.',
      flat_name: 'process.supplemental_groups.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'id',
      normalize: [],
      original_fieldset: 'group',
      short: 'Unique identifier for the group on the system/platform.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-supplemental-groups-name',
      description: 'Name of the group.',
      flat_name: 'process.supplemental_groups.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'name',
      normalize: [],
      original_fieldset: 'group',
      short: 'Name of the group.',
      type: 'keyword'
    }
  },
  thread: {
    id: {
      dashed_name: 'process-thread-id',
      description: 'Thread ID.',
      example: 4242,
      flat_name: 'process.thread.id',
      format: 'string',
      level: 'extended',
      name: 'thread.id',
      normalize: [],
      short: 'Thread ID.',
      type: 'long'
    },
    name: {
      dashed_name: 'process-thread-name',
      description: 'Thread name.',
      example: 'thread-0',
      flat_name: 'process.thread.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'thread.name',
      normalize: [],
      short: 'Thread name.',
      type: 'keyword'
    }
  },
  title: {
    dashed_name: 'process-title',
    description: 'Process title.\n' +
      'The proctitle, some times the same as process name. Can also be different: for example a browser setting its title to the web page currently opened.',
    flat_name: 'process.title',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'process.title.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'title',
    normalize: [],
    short: 'Process title.',
    type: 'keyword'
  },
  tty: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'process-tty',
    description: 'Information about the controlling TTY device. If set, the process belongs to an interactive session.',
    flat_name: 'process.tty',
    level: 'extended',
    name: 'tty',
    normalize: [],
    short: 'Information about the controlling TTY device.',
    type: 'object',
    char_device: {
      major: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'process-tty-char-device-major',
        description: `The major number identifies the driver associated with the device. The character device's major and minor numbers can be algorithmically combined to produce the more familiar terminal identifiers such as "ttyS0" and "pts/0. For more details, please refer to the Linux kernel documentation.`,
        example: 1,
        flat_name: 'process.tty.char_device.major',
        level: 'extended',
        name: 'tty.char_device.major',
        normalize: [],
        short: "The TTY character device's major number.",
        type: 'long'
      },
      minor: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'process-tty-char-device-minor',
        description: 'The minor number is used only by the driver specified by the major number; other parts of the kernel don’t use it, and merely pass it along to the driver. It is common for a driver to control several devices; the minor number provides a way for the driver to differentiate among them.',
        example: 128,
        flat_name: 'process.tty.char_device.minor',
        level: 'extended',
        name: 'tty.char_device.minor',
        normalize: [],
        short: "The TTY character device's minor number.",
        type: 'long'
      }
    }
  },
  uptime: {
    dashed_name: 'process-uptime',
    description: 'Seconds the process has been up.',
    example: 1325,
    flat_name: 'process.uptime',
    level: 'extended',
    name: 'uptime',
    normalize: [],
    short: 'Seconds the process has been up.',
    type: 'long'
  },
  user: {
    id: {
      dashed_name: 'process-user-id',
      description: 'Unique identifier of the user.',
      example: 'S-1-5-21-202424912787-2692429404-2351956786-1000',
      flat_name: 'process.user.id',
      ignore_above: 1024,
      level: 'core',
      name: 'id',
      normalize: [],
      original_fieldset: 'user',
      short: 'Unique identifier of the user.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'process-user-name',
      description: 'Short name or login of the user.',
      example: 'a.einstein',
      flat_name: 'process.user.name',
      ignore_above: 1024,
      level: 'core',
      multi_fields: [
        {
          flat_name: 'process.user.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'name',
      normalize: [],
      original_fieldset: 'user',
      short: 'Short name or login of the user.',
      type: 'keyword'
    }
  },
  working_directory: {
    dashed_name: 'process-working-directory',
    description: 'The working directory of the process.',
    example: '/home/alice',
    flat_name: 'process.working_directory',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'process.working_directory.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'working_directory',
    normalize: [],
    short: 'The working directory of the process.',
    type: 'keyword'
  }
}