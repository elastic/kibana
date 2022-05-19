export const threat_ecs = {
  enrichments: {
    beta: 'This field is beta and subject to change.',
    dashed_name: 'threat-enrichments',
    description: 'A list of associated indicators objects enriching the event, and the context of that association/enrichment.',
    flat_name: 'threat.enrichments',
    level: 'extended',
    name: 'enrichments',
    normalize: [ 'array' ],
    short: 'List of objects containing indicators enriching the event.',
    type: 'nested',
    indicator: {
      beta: 'This field is beta and subject to change.',
      dashed_name: 'threat-enrichments-indicator',
      description: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-description',
        description: 'Describes the type of action conducted by the threat.',
        example: 'IP x.x.x.x was observed delivering the Angler EK.',
        flat_name: 'threat.enrichments.indicator.description',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.indicator.description',
        normalize: [],
        short: 'Indicator description',
        type: 'keyword'
      },
      flat_name: 'threat.enrichments.indicator',
      level: 'extended',
      name: 'enrichments.indicator',
      normalize: [],
      short: 'Object containing indicators enriching the event.',
      type: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-type',
        description: 'Type of indicator as represented by Cyber Observable in STIX 2.0. Recommended values:\n' +
          '  * autonomous-system\n' +
          '  * artifact\n' +
          '  * directory\n' +
          '  * domain-name\n' +
          '  * email-addr\n' +
          '  * file\n' +
          '  * ipv4-addr\n' +
          '  * ipv6-addr\n' +
          '  * mac-addr\n' +
          '  * mutex\n' +
          '  * port\n' +
          '  * process\n' +
          '  * software\n' +
          '  * url\n' +
          '  * user-account\n' +
          '  * windows-registry-key\n' +
          '  * x509-certificate',
        example: 'ipv4-addr',
        flat_name: 'threat.enrichments.indicator.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.indicator.type',
        normalize: [],
        short: 'Type of indicator',
        type: 'keyword'
      },
      as: {
        number: {
          dashed_name: 'threat-enrichments-indicator-as-number',
          description: 'Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.',
          example: 15169,
          flat_name: 'threat.enrichments.indicator.as.number',
          level: 'extended',
          name: 'number',
          normalize: [],
          original_fieldset: 'as',
          short: 'Unique number allocated to the autonomous system.',
          type: 'long'
        },
        organization: {
          name: {
            dashed_name: 'threat-enrichments-indicator-as-organization-name',
            description: 'Organization name.',
            example: 'Google LLC',
            flat_name: 'threat.enrichments.indicator.as.organization.name',
            ignore_above: 1024,
            level: 'extended',
            multi_fields: [
              {
                flat_name: 'threat.enrichments.indicator.as.organization.name.text',
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
      confidence: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-confidence',
        description: 'Identifies the vendor-neutral confidence rating using the None/Low/Medium/High scale defined in Appendix A of the STIX 2.1 framework. Vendor-specific confidence scales may be added as custom fields.\n' +
          'Expected values are:\n' +
          '  * Not Specified\n' +
          '  * None\n' +
          '  * Low\n' +
          '  * Medium\n' +
          '  * High',
        example: 'Medium',
        flat_name: 'threat.enrichments.indicator.confidence',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.indicator.confidence',
        normalize: [],
        short: 'Indicator confidence rating',
        type: 'keyword'
      },
      email: {
        address: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'threat-enrichments-indicator-email-address',
          description: 'Identifies a threat indicator as an email address (irrespective of direction).',
          example: 'phish@example.com',
          flat_name: 'threat.enrichments.indicator.email.address',
          ignore_above: 1024,
          level: 'extended',
          name: 'enrichments.indicator.email.address',
          normalize: [],
          short: 'Indicator email address',
          type: 'keyword'
        }
      },
      file: {
        accessed: {
          dashed_name: 'threat-enrichments-indicator-file-accessed',
          description: 'Last time the file was accessed.\n' +
            'Note that not all filesystems keep track of access time.',
          flat_name: 'threat.enrichments.indicator.file.accessed',
          level: 'extended',
          name: 'accessed',
          normalize: [],
          original_fieldset: 'file',
          short: 'Last time the file was accessed.',
          type: 'date'
        },
        attributes: {
          dashed_name: 'threat-enrichments-indicator-file-attributes',
          description: 'Array of file attributes.\n' +
            "Attributes names will vary by platform. Here's a non-exhaustive list of values that are expected in this field: archive, compressed, directory, encrypted, execute, hidden, read, readonly, system, write.",
          example: '["readonly", "system"]',
          flat_name: 'threat.enrichments.indicator.file.attributes',
          ignore_above: 1024,
          level: 'extended',
          name: 'attributes',
          normalize: [ 'array' ],
          original_fieldset: 'file',
          short: 'Array of file attributes.',
          type: 'keyword'
        },
        code_signature: {
          digest_algorithm: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-digest-algorithm',
            description: 'The hashing algorithm used to sign the process.\n' +
              'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
            example: 'sha256',
            flat_name: 'threat.enrichments.indicator.file.code_signature.digest_algorithm',
            ignore_above: 1024,
            level: 'extended',
            name: 'digest_algorithm',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Hashing algorithm used to sign the process.',
            type: 'keyword'
          },
          exists: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-exists',
            description: 'Boolean to capture if a signature is present.',
            example: 'true',
            flat_name: 'threat.enrichments.indicator.file.code_signature.exists',
            level: 'core',
            name: 'exists',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Boolean to capture if a signature is present.',
            type: 'boolean'
          },
          signing_id: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-signing-id',
            description: 'The identifier used to sign the process.\n' +
              'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
            example: 'com.apple.xpc.proxy',
            flat_name: 'threat.enrichments.indicator.file.code_signature.signing_id',
            ignore_above: 1024,
            level: 'extended',
            name: 'signing_id',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'The identifier used to sign the process.',
            type: 'keyword'
          },
          status: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-status',
            description: 'Additional information about the certificate status.\n' +
              'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
            example: 'ERROR_UNTRUSTED_ROOT',
            flat_name: 'threat.enrichments.indicator.file.code_signature.status',
            ignore_above: 1024,
            level: 'extended',
            name: 'status',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Additional information about the certificate status.',
            type: 'keyword'
          },
          subject_name: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-subject-name',
            description: 'Subject name of the code signer',
            example: 'Microsoft Corporation',
            flat_name: 'threat.enrichments.indicator.file.code_signature.subject_name',
            ignore_above: 1024,
            level: 'core',
            name: 'subject_name',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Subject name of the code signer',
            type: 'keyword'
          },
          team_id: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-team-id',
            description: 'The team identifier used to sign the process.\n' +
              'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
            example: 'EQHXZ8M8AV',
            flat_name: 'threat.enrichments.indicator.file.code_signature.team_id',
            ignore_above: 1024,
            level: 'extended',
            name: 'team_id',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'The team identifier used to sign the process.',
            type: 'keyword'
          },
          timestamp: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-timestamp',
            description: 'Date and time when the code signature was generated and signed.',
            example: '2021-01-01T12:10:30Z',
            flat_name: 'threat.enrichments.indicator.file.code_signature.timestamp',
            level: 'extended',
            name: 'timestamp',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'When the signature was generated and signed.',
            type: 'date'
          },
          trusted: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-trusted',
            description: 'Stores the trust status of the certificate chain.\n' +
              'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
            example: 'true',
            flat_name: 'threat.enrichments.indicator.file.code_signature.trusted',
            level: 'extended',
            name: 'trusted',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Stores the trust status of the certificate chain.',
            type: 'boolean'
          },
          valid: {
            dashed_name: 'threat-enrichments-indicator-file-code-signature-valid',
            description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
              'Leave unpopulated if a certificate was unchecked.',
            example: 'true',
            flat_name: 'threat.enrichments.indicator.file.code_signature.valid',
            level: 'extended',
            name: 'valid',
            normalize: [],
            original_fieldset: 'code_signature',
            short: 'Boolean to capture if the digital signature is verified against the binary content.',
            type: 'boolean'
          }
        },
        created: {
          dashed_name: 'threat-enrichments-indicator-file-created',
          description: 'File creation time.\n' +
            'Note that not all filesystems store the creation time.',
          flat_name: 'threat.enrichments.indicator.file.created',
          level: 'extended',
          name: 'created',
          normalize: [],
          original_fieldset: 'file',
          short: 'File creation time.',
          type: 'date'
        },
        ctime: {
          dashed_name: 'threat-enrichments-indicator-file-ctime',
          description: 'Last time the file attributes or metadata changed.\n' +
            'Note that changes to the file content will update `mtime`. This implies `ctime` will be adjusted at the same time, since `mtime` is an attribute of the file.',
          flat_name: 'threat.enrichments.indicator.file.ctime',
          level: 'extended',
          name: 'ctime',
          normalize: [],
          original_fieldset: 'file',
          short: 'Last time the file attributes or metadata changed.',
          type: 'date'
        },
        device: {
          dashed_name: 'threat-enrichments-indicator-file-device',
          description: 'Device that is the source of the file.',
          example: 'sda',
          flat_name: 'threat.enrichments.indicator.file.device',
          ignore_above: 1024,
          level: 'extended',
          name: 'device',
          normalize: [],
          original_fieldset: 'file',
          short: 'Device that is the source of the file.',
          type: 'keyword'
        },
        directory: {
          dashed_name: 'threat-enrichments-indicator-file-directory',
          description: 'Directory where the file is located. It should include the drive letter, when appropriate.',
          example: '/home/alice',
          flat_name: 'threat.enrichments.indicator.file.directory',
          ignore_above: 1024,
          level: 'extended',
          name: 'directory',
          normalize: [],
          original_fieldset: 'file',
          short: 'Directory where the file is located.',
          type: 'keyword'
        },
        drive_letter: {
          dashed_name: 'threat-enrichments-indicator-file-drive-letter',
          description: 'Drive letter where the file is located. This field is only relevant on Windows.\n' +
            'The value should be uppercase, and not include the colon.',
          example: 'C',
          flat_name: 'threat.enrichments.indicator.file.drive_letter',
          ignore_above: 1,
          level: 'extended',
          name: 'drive_letter',
          normalize: [],
          original_fieldset: 'file',
          short: 'Drive letter where the file is located.',
          type: 'keyword'
        },
        elf: {
          architecture: {
            dashed_name: 'threat-enrichments-indicator-file-elf-architecture',
            description: 'Machine architecture of the ELF file.',
            example: 'x86-64',
            flat_name: 'threat.enrichments.indicator.file.elf.architecture',
            ignore_above: 1024,
            level: 'extended',
            name: 'architecture',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Machine architecture of the ELF file.',
            type: 'keyword'
          },
          byte_order: {
            dashed_name: 'threat-enrichments-indicator-file-elf-byte-order',
            description: 'Byte sequence of ELF file.',
            example: 'Little Endian',
            flat_name: 'threat.enrichments.indicator.file.elf.byte_order',
            ignore_above: 1024,
            level: 'extended',
            name: 'byte_order',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Byte sequence of ELF file.',
            type: 'keyword'
          },
          cpu_type: {
            dashed_name: 'threat-enrichments-indicator-file-elf-cpu-type',
            description: 'CPU type of the ELF file.',
            example: 'Intel',
            flat_name: 'threat.enrichments.indicator.file.elf.cpu_type',
            ignore_above: 1024,
            level: 'extended',
            name: 'cpu_type',
            normalize: [],
            original_fieldset: 'elf',
            short: 'CPU type of the ELF file.',
            type: 'keyword'
          },
          creation_date: {
            dashed_name: 'threat-enrichments-indicator-file-elf-creation-date',
            description: "Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.",
            flat_name: 'threat.enrichments.indicator.file.elf.creation_date',
            level: 'extended',
            name: 'creation_date',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Build or compile date.',
            type: 'date'
          },
          exports: {
            dashed_name: 'threat-enrichments-indicator-file-elf-exports',
            description: 'List of exported element names and types.',
            flat_name: 'threat.enrichments.indicator.file.elf.exports',
            level: 'extended',
            name: 'exports',
            normalize: [ 'array' ],
            original_fieldset: 'elf',
            short: 'List of exported element names and types.',
            type: 'flattened'
          },
          header: {
            abi_version: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-abi-version',
              description: 'Version of the ELF Application Binary Interface (ABI).',
              flat_name: 'threat.enrichments.indicator.file.elf.header.abi_version',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.abi_version',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Version of the ELF Application Binary Interface (ABI).',
              type: 'keyword'
            },
            class: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-class',
              description: 'Header class of the ELF file.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.class',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.class',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Header class of the ELF file.',
              type: 'keyword'
            },
            data: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-data',
              description: 'Data table of the ELF header.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.data',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.data',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Data table of the ELF header.',
              type: 'keyword'
            },
            entrypoint: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-entrypoint',
              description: 'Header entrypoint of the ELF file.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.entrypoint',
              format: 'string',
              level: 'extended',
              name: 'header.entrypoint',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Header entrypoint of the ELF file.',
              type: 'long'
            },
            object_version: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-object-version',
              description: '"0x1" for original ELF files.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.object_version',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.object_version',
              normalize: [],
              original_fieldset: 'elf',
              short: '"0x1" for original ELF files.',
              type: 'keyword'
            },
            os_abi: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-os-abi',
              description: 'Application Binary Interface (ABI) of the Linux OS.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.os_abi',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.os_abi',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Application Binary Interface (ABI) of the Linux OS.',
              type: 'keyword'
            },
            type: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-type',
              description: 'Header type of the ELF file.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.type',
              ignore_above: 1024,
              level: 'extended',
              name: 'header.type',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Header type of the ELF file.',
              type: 'keyword'
            },
            version: {
              dashed_name: 'threat-enrichments-indicator-file-elf-header-version',
              description: 'Version of the ELF header.',
              flat_name: 'threat.enrichments.indicator.file.elf.header.version',
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
            dashed_name: 'threat-enrichments-indicator-file-elf-imports',
            description: 'List of imported element names and types.',
            flat_name: 'threat.enrichments.indicator.file.elf.imports',
            level: 'extended',
            name: 'imports',
            normalize: [ 'array' ],
            original_fieldset: 'elf',
            short: 'List of imported element names and types.',
            type: 'flattened'
          },
          sections: {
            dashed_name: 'threat-enrichments-indicator-file-elf-sections',
            description: 'An array containing an object for each section of the ELF file.\n' +
              'The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.',
            flat_name: 'threat.enrichments.indicator.file.elf.sections',
            level: 'extended',
            name: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-name',
              description: 'ELF Section List name.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.name',
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
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-type',
              description: 'ELF Section List type.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.type',
              ignore_above: 1024,
              level: 'extended',
              name: 'sections.type',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF Section List type.',
              type: 'keyword'
            },
            chi2: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-chi2',
              description: 'Chi-square probability distribution of the section.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.chi2',
              format: 'number',
              level: 'extended',
              name: 'sections.chi2',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Chi-square probability distribution of the section.',
              type: 'long'
            },
            entropy: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-entropy',
              description: 'Shannon entropy calculation from the section.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.entropy',
              format: 'number',
              level: 'extended',
              name: 'sections.entropy',
              normalize: [],
              original_fieldset: 'elf',
              short: 'Shannon entropy calculation from the section.',
              type: 'long'
            },
            flags: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-flags',
              description: 'ELF Section List flags.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.flags',
              ignore_above: 1024,
              level: 'extended',
              name: 'sections.flags',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF Section List flags.',
              type: 'keyword'
            },
            physical_offset: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-physical-offset',
              description: 'ELF Section List offset.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.physical_offset',
              ignore_above: 1024,
              level: 'extended',
              name: 'sections.physical_offset',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF Section List offset.',
              type: 'keyword'
            },
            physical_size: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-physical-size',
              description: 'ELF Section List physical size.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.physical_size',
              format: 'bytes',
              level: 'extended',
              name: 'sections.physical_size',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF Section List physical size.',
              type: 'long'
            },
            virtual_address: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-virtual-address',
              description: 'ELF Section List virtual address.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.virtual_address',
              format: 'string',
              level: 'extended',
              name: 'sections.virtual_address',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF Section List virtual address.',
              type: 'long'
            },
            virtual_size: {
              dashed_name: 'threat-enrichments-indicator-file-elf-sections-virtual-size',
              description: 'ELF Section List virtual size.',
              flat_name: 'threat.enrichments.indicator.file.elf.sections.virtual_size',
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
            dashed_name: 'threat-enrichments-indicator-file-elf-segments',
            description: 'An array containing an object for each segment of the ELF file.\n' +
              'The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.',
            flat_name: 'threat.enrichments.indicator.file.elf.segments',
            level: 'extended',
            name: 'segments',
            normalize: [ 'array' ],
            original_fieldset: 'elf',
            short: 'ELF object segment list.',
            type: {
              dashed_name: 'threat-enrichments-indicator-file-elf-segments-type',
              description: 'ELF object segment type.',
              flat_name: 'threat.enrichments.indicator.file.elf.segments.type',
              ignore_above: 1024,
              level: 'extended',
              name: 'segments.type',
              normalize: [],
              original_fieldset: 'elf',
              short: 'ELF object segment type.',
              type: 'keyword'
            },
            sections: {
              dashed_name: 'threat-enrichments-indicator-file-elf-segments-sections',
              description: 'ELF object segment sections.',
              flat_name: 'threat.enrichments.indicator.file.elf.segments.sections',
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
            dashed_name: 'threat-enrichments-indicator-file-elf-shared-libraries',
            description: 'List of shared libraries used by this ELF object.',
            flat_name: 'threat.enrichments.indicator.file.elf.shared_libraries',
            ignore_above: 1024,
            level: 'extended',
            name: 'shared_libraries',
            normalize: [ 'array' ],
            original_fieldset: 'elf',
            short: 'List of shared libraries used by this ELF object.',
            type: 'keyword'
          },
          telfhash: {
            dashed_name: 'threat-enrichments-indicator-file-elf-telfhash',
            description: 'telfhash symbol hash for ELF file.',
            flat_name: 'threat.enrichments.indicator.file.elf.telfhash',
            ignore_above: 1024,
            level: 'extended',
            name: 'telfhash',
            normalize: [],
            original_fieldset: 'elf',
            short: 'telfhash hash for ELF file.',
            type: 'keyword'
          }
        },
        extension: {
          dashed_name: 'threat-enrichments-indicator-file-extension',
          description: 'File extension, excluding the leading dot.\n' +
            'Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").',
          example: 'png',
          flat_name: 'threat.enrichments.indicator.file.extension',
          ignore_above: 1024,
          level: 'extended',
          name: 'extension',
          normalize: [],
          original_fieldset: 'file',
          short: 'File extension, excluding the leading dot.',
          type: 'keyword'
        },
        fork_name: {
          dashed_name: 'threat-enrichments-indicator-file-fork-name',
          description: 'A fork is additional data associated with a filesystem object.\n' +
            'On Linux, a resource fork is used to store additional data with a filesystem object. A file always has at least one fork for the data portion, and additional forks may exist.\n' +
            'On NTFS, this is analogous to an Alternate Data Stream (ADS), and the default data stream for a file is just called $DATA. Zone.Identifier is commonly used by Windows to track contents downloaded from the Internet. An ADS is typically of the form: `C:\\path\\to\\filename.extension:some_fork_name`, and `some_fork_name` is the value that should populate `fork_name`. `filename.extension` should populate `file.name`, and `extension` should populate `file.extension`. The full path, `file.path`, will include the fork name.',
          example: 'Zone.Identifer',
          flat_name: 'threat.enrichments.indicator.file.fork_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'fork_name',
          normalize: [],
          original_fieldset: 'file',
          short: 'A fork is additional data associated with a filesystem object.',
          type: 'keyword'
        },
        gid: {
          dashed_name: 'threat-enrichments-indicator-file-gid',
          description: 'Primary group ID (GID) of the file.',
          example: '1001',
          flat_name: 'threat.enrichments.indicator.file.gid',
          ignore_above: 1024,
          level: 'extended',
          name: 'gid',
          normalize: [],
          original_fieldset: 'file',
          short: 'Primary group ID (GID) of the file.',
          type: 'keyword'
        },
        group: {
          dashed_name: 'threat-enrichments-indicator-file-group',
          description: 'Primary group name of the file.',
          example: 'alice',
          flat_name: 'threat.enrichments.indicator.file.group',
          ignore_above: 1024,
          level: 'extended',
          name: 'group',
          normalize: [],
          original_fieldset: 'file',
          short: 'Primary group name of the file.',
          type: 'keyword'
        },
        hash: {
          md5: {
            dashed_name: 'threat-enrichments-indicator-file-hash-md5',
            description: 'MD5 hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.md5',
            ignore_above: 1024,
            level: 'extended',
            name: 'md5',
            normalize: [],
            original_fieldset: 'hash',
            short: 'MD5 hash.',
            type: 'keyword'
          },
          sha1: {
            dashed_name: 'threat-enrichments-indicator-file-hash-sha1',
            description: 'SHA1 hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.sha1',
            ignore_above: 1024,
            level: 'extended',
            name: 'sha1',
            normalize: [],
            original_fieldset: 'hash',
            short: 'SHA1 hash.',
            type: 'keyword'
          },
          sha256: {
            dashed_name: 'threat-enrichments-indicator-file-hash-sha256',
            description: 'SHA256 hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.sha256',
            ignore_above: 1024,
            level: 'extended',
            name: 'sha256',
            normalize: [],
            original_fieldset: 'hash',
            short: 'SHA256 hash.',
            type: 'keyword'
          },
          sha384: {
            dashed_name: 'threat-enrichments-indicator-file-hash-sha384',
            description: 'SHA384 hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.sha384',
            ignore_above: 1024,
            level: 'extended',
            name: 'sha384',
            normalize: [],
            original_fieldset: 'hash',
            short: 'SHA384 hash.',
            type: 'keyword'
          },
          sha512: {
            dashed_name: 'threat-enrichments-indicator-file-hash-sha512',
            description: 'SHA512 hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.sha512',
            ignore_above: 1024,
            level: 'extended',
            name: 'sha512',
            normalize: [],
            original_fieldset: 'hash',
            short: 'SHA512 hash.',
            type: 'keyword'
          },
          ssdeep: {
            dashed_name: 'threat-enrichments-indicator-file-hash-ssdeep',
            description: 'SSDEEP hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.ssdeep',
            ignore_above: 1024,
            level: 'extended',
            name: 'ssdeep',
            normalize: [],
            original_fieldset: 'hash',
            short: 'SSDEEP hash.',
            type: 'keyword'
          },
          tlsh: {
            dashed_name: 'threat-enrichments-indicator-file-hash-tlsh',
            description: 'TLSH hash.',
            flat_name: 'threat.enrichments.indicator.file.hash.tlsh',
            ignore_above: 1024,
            level: 'extended',
            name: 'tlsh',
            normalize: [],
            original_fieldset: 'hash',
            short: 'TLSH hash.',
            type: 'keyword'
          }
        },
        inode: {
          dashed_name: 'threat-enrichments-indicator-file-inode',
          description: 'Inode representing the file in the filesystem.',
          example: '256383',
          flat_name: 'threat.enrichments.indicator.file.inode',
          ignore_above: 1024,
          level: 'extended',
          name: 'inode',
          normalize: [],
          original_fieldset: 'file',
          short: 'Inode representing the file in the filesystem.',
          type: 'keyword'
        },
        mime_type: {
          dashed_name: 'threat-enrichments-indicator-file-mime-type',
          description: 'MIME type should identify the format of the file or stream of bytes using https://www.iana.org/assignments/media-types/media-types.xhtml[IANA official types], where possible. When more than one type is applicable, the most specific type should be used.',
          flat_name: 'threat.enrichments.indicator.file.mime_type',
          ignore_above: 1024,
          level: 'extended',
          name: 'mime_type',
          normalize: [],
          original_fieldset: 'file',
          short: 'Media type of file, document, or arrangement of bytes.',
          type: 'keyword'
        },
        mode: {
          dashed_name: 'threat-enrichments-indicator-file-mode',
          description: 'Mode of the file in octal representation.',
          example: '0640',
          flat_name: 'threat.enrichments.indicator.file.mode',
          ignore_above: 1024,
          level: 'extended',
          name: 'mode',
          normalize: [],
          original_fieldset: 'file',
          short: 'Mode of the file in octal representation.',
          type: 'keyword'
        },
        mtime: {
          dashed_name: 'threat-enrichments-indicator-file-mtime',
          description: 'Last time the file content was modified.',
          flat_name: 'threat.enrichments.indicator.file.mtime',
          level: 'extended',
          name: 'mtime',
          normalize: [],
          original_fieldset: 'file',
          short: 'Last time the file content was modified.',
          type: 'date'
        },
        name: {
          dashed_name: 'threat-enrichments-indicator-file-name',
          description: 'Name of the file including the extension, without the directory.',
          example: 'example.png',
          flat_name: 'threat.enrichments.indicator.file.name',
          ignore_above: 1024,
          level: 'extended',
          name: 'name',
          normalize: [],
          original_fieldset: 'file',
          short: 'Name of the file including the extension, without the directory.',
          type: 'keyword'
        },
        owner: {
          dashed_name: 'threat-enrichments-indicator-file-owner',
          description: "File owner's username.",
          example: 'alice',
          flat_name: 'threat.enrichments.indicator.file.owner',
          ignore_above: 1024,
          level: 'extended',
          name: 'owner',
          normalize: [],
          original_fieldset: 'file',
          short: "File owner's username.",
          type: 'keyword'
        },
        path: {
          dashed_name: 'threat-enrichments-indicator-file-path',
          description: 'Full path to the file, including the file name. It should include the drive letter, when appropriate.',
          example: '/home/alice/example.png',
          flat_name: 'threat.enrichments.indicator.file.path',
          ignore_above: 1024,
          level: 'extended',
          multi_fields: [
            {
              flat_name: 'threat.enrichments.indicator.file.path.text',
              name: 'text',
              type: 'match_only_text'
            }
          ],
          name: 'path',
          normalize: [],
          original_fieldset: 'file',
          short: 'Full path to the file, including the file name.',
          type: 'keyword'
        },
        pe: {
          architecture: {
            dashed_name: 'threat-enrichments-indicator-file-pe-architecture',
            description: 'CPU architecture target for the file.',
            example: 'x64',
            flat_name: 'threat.enrichments.indicator.file.pe.architecture',
            ignore_above: 1024,
            level: 'extended',
            name: 'architecture',
            normalize: [],
            original_fieldset: 'pe',
            short: 'CPU architecture target for the file.',
            type: 'keyword'
          },
          company: {
            dashed_name: 'threat-enrichments-indicator-file-pe-company',
            description: 'Internal company name of the file, provided at compile-time.',
            example: 'Microsoft Corporation',
            flat_name: 'threat.enrichments.indicator.file.pe.company',
            ignore_above: 1024,
            level: 'extended',
            name: 'company',
            normalize: [],
            original_fieldset: 'pe',
            short: 'Internal company name of the file, provided at compile-time.',
            type: 'keyword'
          },
          description: {
            dashed_name: 'threat-enrichments-indicator-file-pe-description',
            description: 'Internal description of the file, provided at compile-time.',
            example: 'Paint',
            flat_name: 'threat.enrichments.indicator.file.pe.description',
            ignore_above: 1024,
            level: 'extended',
            name: 'description',
            normalize: [],
            original_fieldset: 'pe',
            short: 'Internal description of the file, provided at compile-time.',
            type: 'keyword'
          },
          file_version: {
            dashed_name: 'threat-enrichments-indicator-file-pe-file-version',
            description: 'Internal version of the file, provided at compile-time.',
            example: '6.3.9600.17415',
            flat_name: 'threat.enrichments.indicator.file.pe.file_version',
            ignore_above: 1024,
            level: 'extended',
            name: 'file_version',
            normalize: [],
            original_fieldset: 'pe',
            short: 'Process name.',
            type: 'keyword'
          },
          imphash: {
            dashed_name: 'threat-enrichments-indicator-file-pe-imphash',
            description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
              'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
            example: '0c6803c4e922103c4dca5963aad36ddf',
            flat_name: 'threat.enrichments.indicator.file.pe.imphash',
            ignore_above: 1024,
            level: 'extended',
            name: 'imphash',
            normalize: [],
            original_fieldset: 'pe',
            short: 'A hash of the imports in a PE file.',
            type: 'keyword'
          },
          original_file_name: {
            dashed_name: 'threat-enrichments-indicator-file-pe-original-file-name',
            description: 'Internal name of the file, provided at compile-time.',
            example: 'MSPAINT.EXE',
            flat_name: 'threat.enrichments.indicator.file.pe.original_file_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'original_file_name',
            normalize: [],
            original_fieldset: 'pe',
            short: 'Internal name of the file, provided at compile-time.',
            type: 'keyword'
          },
          pehash: {
            dashed_name: 'threat-enrichments-indicator-file-pe-pehash',
            description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
              'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
            example: '73ff189b63cd6be375a7ff25179a38d347651975',
            flat_name: 'threat.enrichments.indicator.file.pe.pehash',
            ignore_above: 1024,
            level: 'extended',
            name: 'pehash',
            normalize: [],
            original_fieldset: 'pe',
            short: 'A hash of the PE header and data from one or more PE sections.',
            type: 'keyword'
          },
          product: {
            dashed_name: 'threat-enrichments-indicator-file-pe-product',
            description: 'Internal product name of the file, provided at compile-time.',
            example: 'Microsoft® Windows® Operating System',
            flat_name: 'threat.enrichments.indicator.file.pe.product',
            ignore_above: 1024,
            level: 'extended',
            name: 'product',
            normalize: [],
            original_fieldset: 'pe',
            short: 'Internal product name of the file, provided at compile-time.',
            type: 'keyword'
          }
        },
        size: {
          dashed_name: 'threat-enrichments-indicator-file-size',
          description: 'File size in bytes.\nOnly relevant when `file.type` is "file".',
          example: 16384,
          flat_name: 'threat.enrichments.indicator.file.size',
          level: 'extended',
          name: 'size',
          normalize: [],
          original_fieldset: 'file',
          short: 'File size in bytes.',
          type: 'long'
        },
        target_path: {
          dashed_name: 'threat-enrichments-indicator-file-target-path',
          description: 'Target path for symlinks.',
          flat_name: 'threat.enrichments.indicator.file.target_path',
          ignore_above: 1024,
          level: 'extended',
          multi_fields: [
            {
              flat_name: 'threat.enrichments.indicator.file.target_path.text',
              name: 'text',
              type: 'match_only_text'
            }
          ],
          name: 'target_path',
          normalize: [],
          original_fieldset: 'file',
          short: 'Target path for symlinks.',
          type: 'keyword'
        },
        type: {
          dashed_name: 'threat-enrichments-indicator-file-type',
          description: 'File type (file, dir, or symlink).',
          example: 'file',
          flat_name: 'threat.enrichments.indicator.file.type',
          ignore_above: 1024,
          level: 'extended',
          name: 'type',
          normalize: [],
          original_fieldset: 'file',
          short: 'File type (file, dir, or symlink).',
          type: 'keyword'
        },
        uid: {
          dashed_name: 'threat-enrichments-indicator-file-uid',
          description: 'The user ID (UID) or security identifier (SID) of the file owner.',
          example: '1001',
          flat_name: 'threat.enrichments.indicator.file.uid',
          ignore_above: 1024,
          level: 'extended',
          name: 'uid',
          normalize: [],
          original_fieldset: 'file',
          short: 'The user ID (UID) or security identifier (SID) of the file owner.',
          type: 'keyword'
        },
        x509: {
          alternative_names: {
            dashed_name: 'threat-enrichments-indicator-file-x509-alternative-names',
            description: 'List of subject alternative names (SAN). Name types vary by certificate authority and certificate type but commonly contain IP addresses, DNS names (and wildcards), and email addresses.',
            example: '*.elastic.co',
            flat_name: 'threat.enrichments.indicator.file.x509.alternative_names',
            ignore_above: 1024,
            level: 'extended',
            name: 'alternative_names',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of subject alternative names (SAN).',
            type: 'keyword'
          },
          issuer: {
            common_name: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-common-name',
              description: 'List of common name (CN) of issuing certificate authority.',
              example: 'Example SHA2 High Assurance Server CA',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.common_name',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.common_name',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of common name (CN) of issuing certificate authority.',
              type: 'keyword'
            },
            country: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-country',
              description: 'List of country (C) codes',
              example: 'US',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.country',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.country',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of country (C) codes',
              type: 'keyword'
            },
            distinguished_name: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-distinguished-name',
              description: 'Distinguished name (DN) of issuing certificate authority.',
              example: 'C=US, O=Example Inc, OU=www.example.com, CN=Example SHA2 High Assurance Server CA',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.distinguished_name',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.distinguished_name',
              normalize: [],
              original_fieldset: 'x509',
              short: 'Distinguished name (DN) of issuing certificate authority.',
              type: 'keyword'
            },
            locality: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-locality',
              description: 'List of locality names (L)',
              example: 'Mountain View',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.locality',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.locality',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of locality names (L)',
              type: 'keyword'
            },
            organization: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-organization',
              description: 'List of organizations (O) of issuing certificate authority.',
              example: 'Example Inc',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.organization',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.organization',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of organizations (O) of issuing certificate authority.',
              type: 'keyword'
            },
            organizational_unit: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-organizational-unit',
              description: 'List of organizational units (OU) of issuing certificate authority.',
              example: 'www.example.com',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.organizational_unit',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.organizational_unit',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of organizational units (OU) of issuing certificate authority.',
              type: 'keyword'
            },
            state_or_province: {
              dashed_name: 'threat-enrichments-indicator-file-x509-issuer-state-or-province',
              description: 'List of state or province names (ST, S, or P)',
              example: 'California',
              flat_name: 'threat.enrichments.indicator.file.x509.issuer.state_or_province',
              ignore_above: 1024,
              level: 'extended',
              name: 'issuer.state_or_province',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of state or province names (ST, S, or P)',
              type: 'keyword'
            }
          },
          not_after: {
            dashed_name: 'threat-enrichments-indicator-file-x509-not-after',
            description: 'Time at which the certificate is no longer considered valid.',
            example: '2020-07-16T03:15:39Z',
            flat_name: 'threat.enrichments.indicator.file.x509.not_after',
            level: 'extended',
            name: 'not_after',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Time at which the certificate is no longer considered valid.',
            type: 'date'
          },
          not_before: {
            dashed_name: 'threat-enrichments-indicator-file-x509-not-before',
            description: 'Time at which the certificate is first considered valid.',
            example: '2019-08-16T01:40:25Z',
            flat_name: 'threat.enrichments.indicator.file.x509.not_before',
            level: 'extended',
            name: 'not_before',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Time at which the certificate is first considered valid.',
            type: 'date'
          },
          public_key_algorithm: {
            dashed_name: 'threat-enrichments-indicator-file-x509-public-key-algorithm',
            description: 'Algorithm used to generate the public key.',
            example: 'RSA',
            flat_name: 'threat.enrichments.indicator.file.x509.public_key_algorithm',
            ignore_above: 1024,
            level: 'extended',
            name: 'public_key_algorithm',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Algorithm used to generate the public key.',
            type: 'keyword'
          },
          public_key_curve: {
            dashed_name: 'threat-enrichments-indicator-file-x509-public-key-curve',
            description: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
            example: 'nistp521',
            flat_name: 'threat.enrichments.indicator.file.x509.public_key_curve',
            ignore_above: 1024,
            level: 'extended',
            name: 'public_key_curve',
            normalize: [],
            original_fieldset: 'x509',
            short: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
            type: 'keyword'
          },
          public_key_exponent: {
            dashed_name: 'threat-enrichments-indicator-file-x509-public-key-exponent',
            description: 'Exponent used to derive the public key. This is algorithm specific.',
            doc_values: false,
            example: 65537,
            flat_name: 'threat.enrichments.indicator.file.x509.public_key_exponent',
            index: false,
            level: 'extended',
            name: 'public_key_exponent',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Exponent used to derive the public key. This is algorithm specific.',
            type: 'long'
          },
          public_key_size: {
            dashed_name: 'threat-enrichments-indicator-file-x509-public-key-size',
            description: 'The size of the public key space in bits.',
            example: 2048,
            flat_name: 'threat.enrichments.indicator.file.x509.public_key_size',
            level: 'extended',
            name: 'public_key_size',
            normalize: [],
            original_fieldset: 'x509',
            short: 'The size of the public key space in bits.',
            type: 'long'
          },
          serial_number: {
            dashed_name: 'threat-enrichments-indicator-file-x509-serial-number',
            description: 'Unique serial number issued by the certificate authority. For consistency, if this value is alphanumeric, it should be formatted without colons and uppercase characters.',
            example: '55FBB9C7DEBF09809D12CCAA',
            flat_name: 'threat.enrichments.indicator.file.x509.serial_number',
            ignore_above: 1024,
            level: 'extended',
            name: 'serial_number',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Unique serial number issued by the certificate authority.',
            type: 'keyword'
          },
          signature_algorithm: {
            dashed_name: 'threat-enrichments-indicator-file-x509-signature-algorithm',
            description: 'Identifier for certificate signature algorithm. We recommend using names found in Go Lang Crypto library. See https://github.com/golang/go/blob/go1.14/src/crypto/x509/x509.go#L337-L353.',
            example: 'SHA256-RSA',
            flat_name: 'threat.enrichments.indicator.file.x509.signature_algorithm',
            ignore_above: 1024,
            level: 'extended',
            name: 'signature_algorithm',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Identifier for certificate signature algorithm.',
            type: 'keyword'
          },
          subject: {
            common_name: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-common-name',
              description: 'List of common names (CN) of subject.',
              example: 'shared.global.example.net',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.common_name',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.common_name',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of common names (CN) of subject.',
              type: 'keyword'
            },
            country: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-country',
              description: 'List of country (C) code',
              example: 'US',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.country',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.country',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of country (C) code',
              type: 'keyword'
            },
            distinguished_name: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-distinguished-name',
              description: 'Distinguished name (DN) of the certificate subject entity.',
              example: 'C=US, ST=California, L=San Francisco, O=Example, Inc., CN=shared.global.example.net',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.distinguished_name',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.distinguished_name',
              normalize: [],
              original_fieldset: 'x509',
              short: 'Distinguished name (DN) of the certificate subject entity.',
              type: 'keyword'
            },
            locality: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-locality',
              description: 'List of locality names (L)',
              example: 'San Francisco',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.locality',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.locality',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of locality names (L)',
              type: 'keyword'
            },
            organization: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-organization',
              description: 'List of organizations (O) of subject.',
              example: 'Example, Inc.',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.organization',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.organization',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of organizations (O) of subject.',
              type: 'keyword'
            },
            organizational_unit: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-organizational-unit',
              description: 'List of organizational units (OU) of subject.',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.organizational_unit',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.organizational_unit',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of organizational units (OU) of subject.',
              type: 'keyword'
            },
            state_or_province: {
              dashed_name: 'threat-enrichments-indicator-file-x509-subject-state-or-province',
              description: 'List of state or province names (ST, S, or P)',
              example: 'California',
              flat_name: 'threat.enrichments.indicator.file.x509.subject.state_or_province',
              ignore_above: 1024,
              level: 'extended',
              name: 'subject.state_or_province',
              normalize: [ 'array' ],
              original_fieldset: 'x509',
              short: 'List of state or province names (ST, S, or P)',
              type: 'keyword'
            }
          },
          version_number: {
            dashed_name: 'threat-enrichments-indicator-file-x509-version-number',
            description: 'Version of x509 format.',
            example: 3,
            flat_name: 'threat.enrichments.indicator.file.x509.version_number',
            ignore_above: 1024,
            level: 'extended',
            name: 'version_number',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Version of x509 format.',
            type: 'keyword'
          }
        }
      },
      first_seen: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-first-seen',
        description: 'The date and time when intelligence source first reported sighting this indicator.',
        example: '2020-11-05T17:25:47.000Z',
        flat_name: 'threat.enrichments.indicator.first_seen',
        level: 'extended',
        name: 'enrichments.indicator.first_seen',
        normalize: [],
        short: 'Date/time indicator was first reported.',
        type: 'date'
      },
      geo: {
        city_name: {
          dashed_name: 'threat-enrichments-indicator-geo-city-name',
          description: 'City name.',
          example: 'Montreal',
          flat_name: 'threat.enrichments.indicator.geo.city_name',
          ignore_above: 1024,
          level: 'core',
          name: 'city_name',
          normalize: [],
          original_fieldset: 'geo',
          short: 'City name.',
          type: 'keyword'
        },
        continent_code: {
          dashed_name: 'threat-enrichments-indicator-geo-continent-code',
          description: "Two-letter code representing continent's name.",
          example: 'NA',
          flat_name: 'threat.enrichments.indicator.geo.continent_code',
          ignore_above: 1024,
          level: 'core',
          name: 'continent_code',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Continent code.',
          type: 'keyword'
        },
        continent_name: {
          dashed_name: 'threat-enrichments-indicator-geo-continent-name',
          description: 'Name of the continent.',
          example: 'North America',
          flat_name: 'threat.enrichments.indicator.geo.continent_name',
          ignore_above: 1024,
          level: 'core',
          name: 'continent_name',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Name of the continent.',
          type: 'keyword'
        },
        country_iso_code: {
          dashed_name: 'threat-enrichments-indicator-geo-country-iso-code',
          description: 'Country ISO code.',
          example: 'CA',
          flat_name: 'threat.enrichments.indicator.geo.country_iso_code',
          ignore_above: 1024,
          level: 'core',
          name: 'country_iso_code',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Country ISO code.',
          type: 'keyword'
        },
        country_name: {
          dashed_name: 'threat-enrichments-indicator-geo-country-name',
          description: 'Country name.',
          example: 'Canada',
          flat_name: 'threat.enrichments.indicator.geo.country_name',
          ignore_above: 1024,
          level: 'core',
          name: 'country_name',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Country name.',
          type: 'keyword'
        },
        location: {
          dashed_name: 'threat-enrichments-indicator-geo-location',
          description: 'Longitude and latitude.',
          example: '{ "lon": -73.614830, "lat": 45.505918 }',
          flat_name: 'threat.enrichments.indicator.geo.location',
          level: 'core',
          name: 'location',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Longitude and latitude.',
          type: 'geo_point'
        },
        name: {
          dashed_name: 'threat-enrichments-indicator-geo-name',
          description: 'User-defined description of a location, at the level of granularity they care about.\n' +
            'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
            'Not typically used in automated geolocation.',
          example: 'boston-dc',
          flat_name: 'threat.enrichments.indicator.geo.name',
          ignore_above: 1024,
          level: 'extended',
          name: 'name',
          normalize: [],
          original_fieldset: 'geo',
          short: 'User-defined description of a location.',
          type: 'keyword'
        },
        postal_code: {
          dashed_name: 'threat-enrichments-indicator-geo-postal-code',
          description: 'Postal code associated with the location.\n' +
            'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
          example: 94040,
          flat_name: 'threat.enrichments.indicator.geo.postal_code',
          ignore_above: 1024,
          level: 'core',
          name: 'postal_code',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Postal code.',
          type: 'keyword'
        },
        region_iso_code: {
          dashed_name: 'threat-enrichments-indicator-geo-region-iso-code',
          description: 'Region ISO code.',
          example: 'CA-QC',
          flat_name: 'threat.enrichments.indicator.geo.region_iso_code',
          ignore_above: 1024,
          level: 'core',
          name: 'region_iso_code',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Region ISO code.',
          type: 'keyword'
        },
        region_name: {
          dashed_name: 'threat-enrichments-indicator-geo-region-name',
          description: 'Region name.',
          example: 'Quebec',
          flat_name: 'threat.enrichments.indicator.geo.region_name',
          ignore_above: 1024,
          level: 'core',
          name: 'region_name',
          normalize: [],
          original_fieldset: 'geo',
          short: 'Region name.',
          type: 'keyword'
        },
        timezone: {
          dashed_name: 'threat-enrichments-indicator-geo-timezone',
          description: 'The time zone of the location, such as IANA time zone name.',
          example: 'America/Argentina/Buenos_Aires',
          flat_name: 'threat.enrichments.indicator.geo.timezone',
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
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-ip',
        description: 'Identifies a threat indicator as an IP address (irrespective of direction).',
        example: '1.2.3.4',
        flat_name: 'threat.enrichments.indicator.ip',
        level: 'extended',
        name: 'enrichments.indicator.ip',
        normalize: [],
        short: 'Indicator IP address',
        type: 'ip'
      },
      last_seen: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-last-seen',
        description: 'The date and time when intelligence source last reported sighting this indicator.',
        example: '2020-11-05T17:25:47.000Z',
        flat_name: 'threat.enrichments.indicator.last_seen',
        level: 'extended',
        name: 'enrichments.indicator.last_seen',
        normalize: [],
        short: 'Date/time indicator was last reported.',
        type: 'date'
      },
      marking: {
        tlp: {
          beta: 'This field is beta and subject to change.',
          dashed_name: 'threat-enrichments-indicator-marking-tlp',
          description: 'Traffic Light Protocol sharing markings. Recommended values are:\n' +
            '  * WHITE\n' +
            '  * GREEN\n' +
            '  * AMBER\n' +
            '  * RED',
          example: 'White',
          flat_name: 'threat.enrichments.indicator.marking.tlp',
          ignore_above: 1024,
          level: 'extended',
          name: 'enrichments.indicator.marking.tlp',
          normalize: [],
          short: 'Indicator TLP marking',
          type: 'keyword'
        }
      },
      modified_at: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-modified-at',
        description: 'The date and time when intelligence source last modified information for this indicator.',
        example: '2020-11-05T17:25:47.000Z',
        flat_name: 'threat.enrichments.indicator.modified_at',
        level: 'extended',
        name: 'enrichments.indicator.modified_at',
        normalize: [],
        short: 'Date/time indicator was last updated.',
        type: 'date'
      },
      port: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-port',
        description: 'Identifies a threat indicator as a port number (irrespective of direction).',
        example: 443,
        flat_name: 'threat.enrichments.indicator.port',
        level: 'extended',
        name: 'enrichments.indicator.port',
        normalize: [],
        short: 'Indicator port',
        type: 'long'
      },
      provider: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-provider',
        description: "The name of the indicator's provider.",
        example: 'lrz_urlhaus',
        flat_name: 'threat.enrichments.indicator.provider',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.indicator.provider',
        normalize: [],
        short: 'Indicator provider',
        type: 'keyword'
      },
      reference: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-reference',
        description: 'Reference URL linking to additional information about this indicator.',
        example: 'https://system.example.com/indicator/0001234',
        flat_name: 'threat.enrichments.indicator.reference',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.indicator.reference',
        normalize: [],
        short: 'Indicator reference URL',
        type: 'keyword'
      },
      registry: {
        data: {
          bytes: {
            dashed_name: 'threat-enrichments-indicator-registry-data-bytes',
            description: 'Original bytes written with base64 encoding.\n' +
              'For Windows registry operations, such as SetValueEx and RegQueryValueEx, this corresponds to the data pointed by `lp_data`. This is optional but provides better recoverability and should be populated for REG_BINARY encoded values.',
            example: 'ZQBuAC0AVQBTAAAAZQBuAAAAAAA=',
            flat_name: 'threat.enrichments.indicator.registry.data.bytes',
            ignore_above: 1024,
            level: 'extended',
            name: 'data.bytes',
            normalize: [],
            original_fieldset: 'registry',
            short: 'Original bytes written with base64 encoding.',
            type: 'keyword'
          },
          strings: {
            dashed_name: 'threat-enrichments-indicator-registry-data-strings',
            description: 'Content when writing string types.\n' +
              'Populated as an array when writing string data to the registry. For single string registry types (REG_SZ, REG_EXPAND_SZ), this should be an array with one string. For sequences of string with REG_MULTI_SZ, this array will be variable length. For numeric data, such as REG_DWORD and REG_QWORD, this should be populated with the decimal representation (e.g `"1"`).',
            example: '["C:\\rta\\red_ttp\\bin\\myapp.exe"]',
            flat_name: 'threat.enrichments.indicator.registry.data.strings',
            level: 'core',
            name: 'data.strings',
            normalize: [ 'array' ],
            original_fieldset: 'registry',
            short: 'List of strings representing what was written to the registry.',
            type: 'wildcard'
          },
          type: {
            dashed_name: 'threat-enrichments-indicator-registry-data-type',
            description: 'Standard registry type for encoding contents',
            example: 'REG_SZ',
            flat_name: 'threat.enrichments.indicator.registry.data.type',
            ignore_above: 1024,
            level: 'core',
            name: 'data.type',
            normalize: [],
            original_fieldset: 'registry',
            short: 'Standard registry type for encoding contents',
            type: 'keyword'
          }
        },
        hive: {
          dashed_name: 'threat-enrichments-indicator-registry-hive',
          description: 'Abbreviated name for the hive.',
          example: 'HKLM',
          flat_name: 'threat.enrichments.indicator.registry.hive',
          ignore_above: 1024,
          level: 'core',
          name: 'hive',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Abbreviated name for the hive.',
          type: 'keyword'
        },
        key: {
          dashed_name: 'threat-enrichments-indicator-registry-key',
          description: 'Hive-relative path of keys.',
          example: 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe',
          flat_name: 'threat.enrichments.indicator.registry.key',
          ignore_above: 1024,
          level: 'core',
          name: 'key',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Hive-relative path of keys.',
          type: 'keyword'
        },
        path: {
          dashed_name: 'threat-enrichments-indicator-registry-path',
          description: 'Full path, including hive, key and value',
          example: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe\\Debugger',
          flat_name: 'threat.enrichments.indicator.registry.path',
          ignore_above: 1024,
          level: 'core',
          name: 'path',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Full path, including hive, key and value',
          type: 'keyword'
        },
        value: {
          dashed_name: 'threat-enrichments-indicator-registry-value',
          description: 'Name of the value written.',
          example: 'Debugger',
          flat_name: 'threat.enrichments.indicator.registry.value',
          ignore_above: 1024,
          level: 'core',
          name: 'value',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Name of the value written.',
          type: 'keyword'
        }
      },
      scanner_stats: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-scanner-stats',
        description: 'Count of AV/EDR vendors that successfully detected malicious file or URL.',
        example: 4,
        flat_name: 'threat.enrichments.indicator.scanner_stats',
        level: 'extended',
        name: 'enrichments.indicator.scanner_stats',
        normalize: [],
        short: 'Scanner statistics',
        type: 'long'
      },
      sightings: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-indicator-sightings',
        description: 'Number of times this indicator was observed conducting threat activity.',
        example: 20,
        flat_name: 'threat.enrichments.indicator.sightings',
        level: 'extended',
        name: 'enrichments.indicator.sightings',
        normalize: [],
        short: 'Number of times indicator observed',
        type: 'long'
      },
      url: {
        domain: {
          dashed_name: 'threat-enrichments-indicator-url-domain',
          description: 'Domain of the url, such as "www.elastic.co".\n' +
            'In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.\n' +
            'If the URL contains a literal IPv6 address enclosed by `[` and `]` (IETF RFC 2732), the `[` and `]` characters should also be captured in the `domain` field.',
          example: 'www.elastic.co',
          flat_name: 'threat.enrichments.indicator.url.domain',
          ignore_above: 1024,
          level: 'extended',
          name: 'domain',
          normalize: [],
          original_fieldset: 'url',
          short: 'Domain of the url.',
          type: 'keyword'
        },
        extension: {
          dashed_name: 'threat-enrichments-indicator-url-extension',
          description: 'The field contains the file extension from the original request url, excluding the leading dot.\n' +
            'The file extension is only set if it exists, as not every url has a file extension.\n' +
            'The leading period must not be included. For example, the value must be "png", not ".png".\n' +
            'Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").',
          example: 'png',
          flat_name: 'threat.enrichments.indicator.url.extension',
          ignore_above: 1024,
          level: 'extended',
          name: 'extension',
          normalize: [],
          original_fieldset: 'url',
          short: 'File extension from the request url, excluding the leading dot.',
          type: 'keyword'
        },
        fragment: {
          dashed_name: 'threat-enrichments-indicator-url-fragment',
          description: 'Portion of the url after the `#`, such as "top".\n' +
            'The `#` is not part of the fragment.',
          flat_name: 'threat.enrichments.indicator.url.fragment',
          ignore_above: 1024,
          level: 'extended',
          name: 'fragment',
          normalize: [],
          original_fieldset: 'url',
          short: 'Portion of the url after the `#`.',
          type: 'keyword'
        },
        full: {
          dashed_name: 'threat-enrichments-indicator-url-full',
          description: 'If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.',
          example: 'https://www.elastic.co:443/search?q=elasticsearch#top',
          flat_name: 'threat.enrichments.indicator.url.full',
          level: 'extended',
          multi_fields: [
            {
              flat_name: 'threat.enrichments.indicator.url.full.text',
              name: 'text',
              type: 'match_only_text'
            }
          ],
          name: 'full',
          normalize: [],
          original_fieldset: 'url',
          short: 'Full unparsed URL.',
          type: 'wildcard'
        },
        original: {
          dashed_name: 'threat-enrichments-indicator-url-original',
          description: 'Unmodified original url as seen in the event source.\n' +
            'Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path.\n' +
            'This field is meant to represent the URL as it was observed, complete or not.',
          example: 'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
          flat_name: 'threat.enrichments.indicator.url.original',
          level: 'extended',
          multi_fields: [
            {
              flat_name: 'threat.enrichments.indicator.url.original.text',
              name: 'text',
              type: 'match_only_text'
            }
          ],
          name: 'original',
          normalize: [],
          original_fieldset: 'url',
          short: 'Unmodified original url as seen in the event source.',
          type: 'wildcard'
        },
        password: {
          dashed_name: 'threat-enrichments-indicator-url-password',
          description: 'Password of the request.',
          flat_name: 'threat.enrichments.indicator.url.password',
          ignore_above: 1024,
          level: 'extended',
          name: 'password',
          normalize: [],
          original_fieldset: 'url',
          short: 'Password of the request.',
          type: 'keyword'
        },
        path: {
          dashed_name: 'threat-enrichments-indicator-url-path',
          description: 'Path of the request, such as "/search".',
          flat_name: 'threat.enrichments.indicator.url.path',
          level: 'extended',
          name: 'path',
          normalize: [],
          original_fieldset: 'url',
          short: 'Path of the request, such as "/search".',
          type: 'wildcard'
        },
        port: {
          dashed_name: 'threat-enrichments-indicator-url-port',
          description: 'Port of the request, such as 443.',
          example: 443,
          flat_name: 'threat.enrichments.indicator.url.port',
          format: 'string',
          level: 'extended',
          name: 'port',
          normalize: [],
          original_fieldset: 'url',
          short: 'Port of the request, such as 443.',
          type: 'long'
        },
        query: {
          dashed_name: 'threat-enrichments-indicator-url-query',
          description: 'The query field describes the query string of the request, such as "q=elasticsearch".\n' +
            'The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.',
          flat_name: 'threat.enrichments.indicator.url.query',
          ignore_above: 1024,
          level: 'extended',
          name: 'query',
          normalize: [],
          original_fieldset: 'url',
          short: 'Query string of the request.',
          type: 'keyword'
        },
        registered_domain: {
          dashed_name: 'threat-enrichments-indicator-url-registered-domain',
          description: 'The highest registered url domain, stripped of the subdomain.\n' +
            'For example, the registered domain for "foo.example.com" is "example.com".\n' +
            'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".',
          example: 'example.com',
          flat_name: 'threat.enrichments.indicator.url.registered_domain',
          ignore_above: 1024,
          level: 'extended',
          name: 'registered_domain',
          normalize: [],
          original_fieldset: 'url',
          short: 'The highest registered url domain, stripped of the subdomain.',
          type: 'keyword'
        },
        scheme: {
          dashed_name: 'threat-enrichments-indicator-url-scheme',
          description: 'Scheme of the request, such as "https".\n' +
            'Note: The `:` is not part of the scheme.',
          example: 'https',
          flat_name: 'threat.enrichments.indicator.url.scheme',
          ignore_above: 1024,
          level: 'extended',
          name: 'scheme',
          normalize: [],
          original_fieldset: 'url',
          short: 'Scheme of the url.',
          type: 'keyword'
        },
        subdomain: {
          dashed_name: 'threat-enrichments-indicator-url-subdomain',
          description: 'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.\n' +
            'For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.',
          example: 'east',
          flat_name: 'threat.enrichments.indicator.url.subdomain',
          ignore_above: 1024,
          level: 'extended',
          name: 'subdomain',
          normalize: [],
          original_fieldset: 'url',
          short: 'The subdomain of the domain.',
          type: 'keyword'
        },
        top_level_domain: {
          dashed_name: 'threat-enrichments-indicator-url-top-level-domain',
          description: 'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".\n' +
            'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".',
          example: 'co.uk',
          flat_name: 'threat.enrichments.indicator.url.top_level_domain',
          ignore_above: 1024,
          level: 'extended',
          name: 'top_level_domain',
          normalize: [],
          original_fieldset: 'url',
          short: 'The effective top level domain (com, org, net, co.uk).',
          type: 'keyword'
        },
        username: {
          dashed_name: 'threat-enrichments-indicator-url-username',
          description: 'Username of the request.',
          flat_name: 'threat.enrichments.indicator.url.username',
          ignore_above: 1024,
          level: 'extended',
          name: 'username',
          normalize: [],
          original_fieldset: 'url',
          short: 'Username of the request.',
          type: 'keyword'
        }
      },
      x509: {
        alternative_names: {
          dashed_name: 'threat-enrichments-indicator-x509-alternative-names',
          description: 'List of subject alternative names (SAN). Name types vary by certificate authority and certificate type but commonly contain IP addresses, DNS names (and wildcards), and email addresses.',
          example: '*.elastic.co',
          flat_name: 'threat.enrichments.indicator.x509.alternative_names',
          ignore_above: 1024,
          level: 'extended',
          name: 'alternative_names',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of subject alternative names (SAN).',
          type: 'keyword'
        },
        issuer: {
          common_name: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-common-name',
            description: 'List of common name (CN) of issuing certificate authority.',
            example: 'Example SHA2 High Assurance Server CA',
            flat_name: 'threat.enrichments.indicator.x509.issuer.common_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.common_name',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of common name (CN) of issuing certificate authority.',
            type: 'keyword'
          },
          country: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-country',
            description: 'List of country (C) codes',
            example: 'US',
            flat_name: 'threat.enrichments.indicator.x509.issuer.country',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.country',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of country (C) codes',
            type: 'keyword'
          },
          distinguished_name: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-distinguished-name',
            description: 'Distinguished name (DN) of issuing certificate authority.',
            example: 'C=US, O=Example Inc, OU=www.example.com, CN=Example SHA2 High Assurance Server CA',
            flat_name: 'threat.enrichments.indicator.x509.issuer.distinguished_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.distinguished_name',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Distinguished name (DN) of issuing certificate authority.',
            type: 'keyword'
          },
          locality: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-locality',
            description: 'List of locality names (L)',
            example: 'Mountain View',
            flat_name: 'threat.enrichments.indicator.x509.issuer.locality',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.locality',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of locality names (L)',
            type: 'keyword'
          },
          organization: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-organization',
            description: 'List of organizations (O) of issuing certificate authority.',
            example: 'Example Inc',
            flat_name: 'threat.enrichments.indicator.x509.issuer.organization',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.organization',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizations (O) of issuing certificate authority.',
            type: 'keyword'
          },
          organizational_unit: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-organizational-unit',
            description: 'List of organizational units (OU) of issuing certificate authority.',
            example: 'www.example.com',
            flat_name: 'threat.enrichments.indicator.x509.issuer.organizational_unit',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.organizational_unit',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizational units (OU) of issuing certificate authority.',
            type: 'keyword'
          },
          state_or_province: {
            dashed_name: 'threat-enrichments-indicator-x509-issuer-state-or-province',
            description: 'List of state or province names (ST, S, or P)',
            example: 'California',
            flat_name: 'threat.enrichments.indicator.x509.issuer.state_or_province',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.state_or_province',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of state or province names (ST, S, or P)',
            type: 'keyword'
          }
        },
        not_after: {
          dashed_name: 'threat-enrichments-indicator-x509-not-after',
          description: 'Time at which the certificate is no longer considered valid.',
          example: '2020-07-16T03:15:39Z',
          flat_name: 'threat.enrichments.indicator.x509.not_after',
          level: 'extended',
          name: 'not_after',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Time at which the certificate is no longer considered valid.',
          type: 'date'
        },
        not_before: {
          dashed_name: 'threat-enrichments-indicator-x509-not-before',
          description: 'Time at which the certificate is first considered valid.',
          example: '2019-08-16T01:40:25Z',
          flat_name: 'threat.enrichments.indicator.x509.not_before',
          level: 'extended',
          name: 'not_before',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Time at which the certificate is first considered valid.',
          type: 'date'
        },
        public_key_algorithm: {
          dashed_name: 'threat-enrichments-indicator-x509-public-key-algorithm',
          description: 'Algorithm used to generate the public key.',
          example: 'RSA',
          flat_name: 'threat.enrichments.indicator.x509.public_key_algorithm',
          ignore_above: 1024,
          level: 'extended',
          name: 'public_key_algorithm',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Algorithm used to generate the public key.',
          type: 'keyword'
        },
        public_key_curve: {
          dashed_name: 'threat-enrichments-indicator-x509-public-key-curve',
          description: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
          example: 'nistp521',
          flat_name: 'threat.enrichments.indicator.x509.public_key_curve',
          ignore_above: 1024,
          level: 'extended',
          name: 'public_key_curve',
          normalize: [],
          original_fieldset: 'x509',
          short: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
          type: 'keyword'
        },
        public_key_exponent: {
          dashed_name: 'threat-enrichments-indicator-x509-public-key-exponent',
          description: 'Exponent used to derive the public key. This is algorithm specific.',
          doc_values: false,
          example: 65537,
          flat_name: 'threat.enrichments.indicator.x509.public_key_exponent',
          index: false,
          level: 'extended',
          name: 'public_key_exponent',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Exponent used to derive the public key. This is algorithm specific.',
          type: 'long'
        },
        public_key_size: {
          dashed_name: 'threat-enrichments-indicator-x509-public-key-size',
          description: 'The size of the public key space in bits.',
          example: 2048,
          flat_name: 'threat.enrichments.indicator.x509.public_key_size',
          level: 'extended',
          name: 'public_key_size',
          normalize: [],
          original_fieldset: 'x509',
          short: 'The size of the public key space in bits.',
          type: 'long'
        },
        serial_number: {
          dashed_name: 'threat-enrichments-indicator-x509-serial-number',
          description: 'Unique serial number issued by the certificate authority. For consistency, if this value is alphanumeric, it should be formatted without colons and uppercase characters.',
          example: '55FBB9C7DEBF09809D12CCAA',
          flat_name: 'threat.enrichments.indicator.x509.serial_number',
          ignore_above: 1024,
          level: 'extended',
          name: 'serial_number',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Unique serial number issued by the certificate authority.',
          type: 'keyword'
        },
        signature_algorithm: {
          dashed_name: 'threat-enrichments-indicator-x509-signature-algorithm',
          description: 'Identifier for certificate signature algorithm. We recommend using names found in Go Lang Crypto library. See https://github.com/golang/go/blob/go1.14/src/crypto/x509/x509.go#L337-L353.',
          example: 'SHA256-RSA',
          flat_name: 'threat.enrichments.indicator.x509.signature_algorithm',
          ignore_above: 1024,
          level: 'extended',
          name: 'signature_algorithm',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Identifier for certificate signature algorithm.',
          type: 'keyword'
        },
        subject: {
          common_name: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-common-name',
            description: 'List of common names (CN) of subject.',
            example: 'shared.global.example.net',
            flat_name: 'threat.enrichments.indicator.x509.subject.common_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.common_name',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of common names (CN) of subject.',
            type: 'keyword'
          },
          country: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-country',
            description: 'List of country (C) code',
            example: 'US',
            flat_name: 'threat.enrichments.indicator.x509.subject.country',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.country',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of country (C) code',
            type: 'keyword'
          },
          distinguished_name: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-distinguished-name',
            description: 'Distinguished name (DN) of the certificate subject entity.',
            example: 'C=US, ST=California, L=San Francisco, O=Example, Inc., CN=shared.global.example.net',
            flat_name: 'threat.enrichments.indicator.x509.subject.distinguished_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.distinguished_name',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Distinguished name (DN) of the certificate subject entity.',
            type: 'keyword'
          },
          locality: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-locality',
            description: 'List of locality names (L)',
            example: 'San Francisco',
            flat_name: 'threat.enrichments.indicator.x509.subject.locality',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.locality',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of locality names (L)',
            type: 'keyword'
          },
          organization: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-organization',
            description: 'List of organizations (O) of subject.',
            example: 'Example, Inc.',
            flat_name: 'threat.enrichments.indicator.x509.subject.organization',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.organization',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizations (O) of subject.',
            type: 'keyword'
          },
          organizational_unit: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-organizational-unit',
            description: 'List of organizational units (OU) of subject.',
            flat_name: 'threat.enrichments.indicator.x509.subject.organizational_unit',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.organizational_unit',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizational units (OU) of subject.',
            type: 'keyword'
          },
          state_or_province: {
            dashed_name: 'threat-enrichments-indicator-x509-subject-state-or-province',
            description: 'List of state or province names (ST, S, or P)',
            example: 'California',
            flat_name: 'threat.enrichments.indicator.x509.subject.state_or_province',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.state_or_province',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of state or province names (ST, S, or P)',
            type: 'keyword'
          }
        },
        version_number: {
          dashed_name: 'threat-enrichments-indicator-x509-version-number',
          description: 'Version of x509 format.',
          example: 3,
          flat_name: 'threat.enrichments.indicator.x509.version_number',
          ignore_above: 1024,
          level: 'extended',
          name: 'version_number',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Version of x509 format.',
          type: 'keyword'
        }
      }
    },
    matched: {
      atomic: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-matched-atomic',
        description: 'Identifies the atomic indicator value that matched a local environment endpoint or network event.',
        example: 'bad-domain.com',
        flat_name: 'threat.enrichments.matched.atomic',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.matched.atomic',
        normalize: [],
        short: 'Matched indicator value',
        type: 'keyword'
      },
      field: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-matched-field',
        description: 'Identifies the field of the atomic indicator that matched a local environment endpoint or network event.',
        example: 'file.hash.sha256',
        flat_name: 'threat.enrichments.matched.field',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.matched.field',
        normalize: [],
        short: 'Matched indicator field',
        type: 'keyword'
      },
      id: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-matched-id',
        description: 'Identifies the _id of the indicator document enriching the event.',
        example: 'ff93aee5-86a1-4a61-b0e6-0cdc313d01b5',
        flat_name: 'threat.enrichments.matched.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.matched.id',
        normalize: [],
        short: 'Matched indicator identifier',
        type: 'keyword'
      },
      index: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-matched-index',
        description: 'Identifies the _index of the indicator document enriching the event.',
        example: 'filebeat-8.0.0-2021.05.23-000011',
        flat_name: 'threat.enrichments.matched.index',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.matched.index',
        normalize: [],
        short: 'Matched indicator index',
        type: 'keyword'
      },
      occurred: {
        dashed_name: 'threat-enrichments-matched-occurred',
        description: 'Indicates when the indicator match was generated',
        example: '2021-10-05T17:00:58.326Z',
        flat_name: 'threat.enrichments.matched.occurred',
        level: 'extended',
        name: 'enrichments.matched.occurred',
        normalize: [],
        short: 'Date of match',
        type: 'date'
      },
      type: {
        beta: 'This field is beta and subject to change.',
        dashed_name: 'threat-enrichments-matched-type',
        description: 'Identifies the type of match that caused the event to be enriched with the given indicator',
        example: 'indicator_match_rule',
        flat_name: 'threat.enrichments.matched.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'enrichments.matched.type',
        normalize: [],
        short: 'Type of indicator match',
        type: 'keyword'
      }
    }
  },
  feed: {
    dashboard_id: {
      dashed_name: 'threat-feed-dashboard-id',
      description: 'The saved object ID of the dashboard belonging to the threat feed for displaying dashboard links to threat feeds in Kibana.',
      example: '5ba16340-72e6-11eb-a3e3-b3cc7c78a70f',
      flat_name: 'threat.feed.dashboard_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.dashboard_id',
      normalize: [],
      short: 'Feed dashboard ID.',
      type: 'keyword'
    },
    description: {
      dashed_name: 'threat-feed-description',
      description: 'Description of the threat feed in a UI friendly format.',
      example: 'Threat feed from the AlienVault Open Threat eXchange network.',
      flat_name: 'threat.feed.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.description',
      normalize: [],
      short: 'Description of the threat feed.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-feed-name',
      description: 'The name of the threat feed in UI friendly format.',
      example: 'AlienVault OTX',
      flat_name: 'threat.feed.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.name',
      normalize: [],
      short: 'Name of the threat feed.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-feed-reference',
      description: 'Reference information for the threat feed in a UI friendly format.',
      example: 'https://otx.alienvault.com',
      flat_name: 'threat.feed.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'feed.reference',
      normalize: [],
      short: 'Reference for the threat feed.',
      type: 'keyword'
    }
  },
  framework: {
    dashed_name: 'threat-framework',
    description: 'Name of the threat framework used to further categorize and classify the tactic and technique of the reported threat. Framework classification can be provided by detecting systems, evaluated at ingest time, or retrospectively tagged to events.',
    example: 'MITRE ATT&CK',
    flat_name: 'threat.framework',
    ignore_above: 1024,
    level: 'extended',
    name: 'framework',
    normalize: [],
    short: 'Threat classification framework.',
    type: 'keyword'
  },
  group: {
    alias: {
      dashed_name: 'threat-group-alias',
      description: 'The alias(es) of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group alias(es).',
      example: '[ "Magecart Group 6" ]',
      flat_name: 'threat.group.alias',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.alias',
      normalize: [ 'array' ],
      short: 'Alias of the group.',
      type: 'keyword'
    },
    id: {
      dashed_name: 'threat-group-id',
      description: 'The id of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group id.',
      example: 'G0037',
      flat_name: 'threat.group.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.id',
      normalize: [],
      short: 'ID of the group.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-group-name',
      description: 'The name of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group name.',
      example: 'FIN6',
      flat_name: 'threat.group.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.name',
      normalize: [],
      short: 'Name of the group.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-group-reference',
      description: 'The reference URL of the group for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® group reference URL.',
      example: 'https://attack.mitre.org/groups/G0037/',
      flat_name: 'threat.group.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'group.reference',
      normalize: [],
      short: 'Reference URL of the group.',
      type: 'keyword'
    }
  },
  indicator: {
    as: {
      number: {
        dashed_name: 'threat-indicator-as-number',
        description: 'Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.',
        example: 15169,
        flat_name: 'threat.indicator.as.number',
        level: 'extended',
        name: 'number',
        normalize: [],
        original_fieldset: 'as',
        short: 'Unique number allocated to the autonomous system.',
        type: 'long'
      },
      organization: {
        name: {
          dashed_name: 'threat-indicator-as-organization-name',
          description: 'Organization name.',
          example: 'Google LLC',
          flat_name: 'threat.indicator.as.organization.name',
          ignore_above: 1024,
          level: 'extended',
          multi_fields: [
            {
              flat_name: 'threat.indicator.as.organization.name.text',
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
    confidence: {
      dashed_name: 'threat-indicator-confidence',
      description: 'Identifies the vendor-neutral confidence rating using the None/Low/Medium/High scale defined in Appendix A of the STIX 2.1 framework. Vendor-specific confidence scales may be added as custom fields.\n' +
        'Expected values are:\n' +
        '  * Not Specified\n' +
        '  * None\n' +
        '  * Low\n' +
        '  * Medium\n' +
        '  * High',
      example: 'Medium',
      flat_name: 'threat.indicator.confidence',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.confidence',
      normalize: [],
      short: 'Indicator confidence rating',
      type: 'keyword'
    },
    description: {
      dashed_name: 'threat-indicator-description',
      description: 'Describes the type of action conducted by the threat.',
      example: 'IP x.x.x.x was observed delivering the Angler EK.',
      flat_name: 'threat.indicator.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.description',
      normalize: [],
      short: 'Indicator description',
      type: 'keyword'
    },
    email: {
      address: {
        dashed_name: 'threat-indicator-email-address',
        description: 'Identifies a threat indicator as an email address (irrespective of direction).',
        example: 'phish@example.com',
        flat_name: 'threat.indicator.email.address',
        ignore_above: 1024,
        level: 'extended',
        name: 'indicator.email.address',
        normalize: [],
        short: 'Indicator email address',
        type: 'keyword'
      }
    },
    file: {
      accessed: {
        dashed_name: 'threat-indicator-file-accessed',
        description: 'Last time the file was accessed.\n' +
          'Note that not all filesystems keep track of access time.',
        flat_name: 'threat.indicator.file.accessed',
        level: 'extended',
        name: 'accessed',
        normalize: [],
        original_fieldset: 'file',
        short: 'Last time the file was accessed.',
        type: 'date'
      },
      attributes: {
        dashed_name: 'threat-indicator-file-attributes',
        description: 'Array of file attributes.\n' +
          "Attributes names will vary by platform. Here's a non-exhaustive list of values that are expected in this field: archive, compressed, directory, encrypted, execute, hidden, read, readonly, system, write.",
        example: '["readonly", "system"]',
        flat_name: 'threat.indicator.file.attributes',
        ignore_above: 1024,
        level: 'extended',
        name: 'attributes',
        normalize: [ 'array' ],
        original_fieldset: 'file',
        short: 'Array of file attributes.',
        type: 'keyword'
      },
      code_signature: {
        digest_algorithm: {
          dashed_name: 'threat-indicator-file-code-signature-digest-algorithm',
          description: 'The hashing algorithm used to sign the process.\n' +
            'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
          example: 'sha256',
          flat_name: 'threat.indicator.file.code_signature.digest_algorithm',
          ignore_above: 1024,
          level: 'extended',
          name: 'digest_algorithm',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Hashing algorithm used to sign the process.',
          type: 'keyword'
        },
        exists: {
          dashed_name: 'threat-indicator-file-code-signature-exists',
          description: 'Boolean to capture if a signature is present.',
          example: 'true',
          flat_name: 'threat.indicator.file.code_signature.exists',
          level: 'core',
          name: 'exists',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Boolean to capture if a signature is present.',
          type: 'boolean'
        },
        signing_id: {
          dashed_name: 'threat-indicator-file-code-signature-signing-id',
          description: 'The identifier used to sign the process.\n' +
            'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
          example: 'com.apple.xpc.proxy',
          flat_name: 'threat.indicator.file.code_signature.signing_id',
          ignore_above: 1024,
          level: 'extended',
          name: 'signing_id',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'The identifier used to sign the process.',
          type: 'keyword'
        },
        status: {
          dashed_name: 'threat-indicator-file-code-signature-status',
          description: 'Additional information about the certificate status.\n' +
            'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
          example: 'ERROR_UNTRUSTED_ROOT',
          flat_name: 'threat.indicator.file.code_signature.status',
          ignore_above: 1024,
          level: 'extended',
          name: 'status',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Additional information about the certificate status.',
          type: 'keyword'
        },
        subject_name: {
          dashed_name: 'threat-indicator-file-code-signature-subject-name',
          description: 'Subject name of the code signer',
          example: 'Microsoft Corporation',
          flat_name: 'threat.indicator.file.code_signature.subject_name',
          ignore_above: 1024,
          level: 'core',
          name: 'subject_name',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Subject name of the code signer',
          type: 'keyword'
        },
        team_id: {
          dashed_name: 'threat-indicator-file-code-signature-team-id',
          description: 'The team identifier used to sign the process.\n' +
            'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
          example: 'EQHXZ8M8AV',
          flat_name: 'threat.indicator.file.code_signature.team_id',
          ignore_above: 1024,
          level: 'extended',
          name: 'team_id',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'The team identifier used to sign the process.',
          type: 'keyword'
        },
        timestamp: {
          dashed_name: 'threat-indicator-file-code-signature-timestamp',
          description: 'Date and time when the code signature was generated and signed.',
          example: '2021-01-01T12:10:30Z',
          flat_name: 'threat.indicator.file.code_signature.timestamp',
          level: 'extended',
          name: 'timestamp',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'When the signature was generated and signed.',
          type: 'date'
        },
        trusted: {
          dashed_name: 'threat-indicator-file-code-signature-trusted',
          description: 'Stores the trust status of the certificate chain.\n' +
            'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
          example: 'true',
          flat_name: 'threat.indicator.file.code_signature.trusted',
          level: 'extended',
          name: 'trusted',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Stores the trust status of the certificate chain.',
          type: 'boolean'
        },
        valid: {
          dashed_name: 'threat-indicator-file-code-signature-valid',
          description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
            'Leave unpopulated if a certificate was unchecked.',
          example: 'true',
          flat_name: 'threat.indicator.file.code_signature.valid',
          level: 'extended',
          name: 'valid',
          normalize: [],
          original_fieldset: 'code_signature',
          short: 'Boolean to capture if the digital signature is verified against the binary content.',
          type: 'boolean'
        }
      },
      created: {
        dashed_name: 'threat-indicator-file-created',
        description: 'File creation time.\n' +
          'Note that not all filesystems store the creation time.',
        flat_name: 'threat.indicator.file.created',
        level: 'extended',
        name: 'created',
        normalize: [],
        original_fieldset: 'file',
        short: 'File creation time.',
        type: 'date'
      },
      ctime: {
        dashed_name: 'threat-indicator-file-ctime',
        description: 'Last time the file attributes or metadata changed.\n' +
          'Note that changes to the file content will update `mtime`. This implies `ctime` will be adjusted at the same time, since `mtime` is an attribute of the file.',
        flat_name: 'threat.indicator.file.ctime',
        level: 'extended',
        name: 'ctime',
        normalize: [],
        original_fieldset: 'file',
        short: 'Last time the file attributes or metadata changed.',
        type: 'date'
      },
      device: {
        dashed_name: 'threat-indicator-file-device',
        description: 'Device that is the source of the file.',
        example: 'sda',
        flat_name: 'threat.indicator.file.device',
        ignore_above: 1024,
        level: 'extended',
        name: 'device',
        normalize: [],
        original_fieldset: 'file',
        short: 'Device that is the source of the file.',
        type: 'keyword'
      },
      directory: {
        dashed_name: 'threat-indicator-file-directory',
        description: 'Directory where the file is located. It should include the drive letter, when appropriate.',
        example: '/home/alice',
        flat_name: 'threat.indicator.file.directory',
        ignore_above: 1024,
        level: 'extended',
        name: 'directory',
        normalize: [],
        original_fieldset: 'file',
        short: 'Directory where the file is located.',
        type: 'keyword'
      },
      drive_letter: {
        dashed_name: 'threat-indicator-file-drive-letter',
        description: 'Drive letter where the file is located. This field is only relevant on Windows.\n' +
          'The value should be uppercase, and not include the colon.',
        example: 'C',
        flat_name: 'threat.indicator.file.drive_letter',
        ignore_above: 1,
        level: 'extended',
        name: 'drive_letter',
        normalize: [],
        original_fieldset: 'file',
        short: 'Drive letter where the file is located.',
        type: 'keyword'
      },
      elf: {
        architecture: {
          dashed_name: 'threat-indicator-file-elf-architecture',
          description: 'Machine architecture of the ELF file.',
          example: 'x86-64',
          flat_name: 'threat.indicator.file.elf.architecture',
          ignore_above: 1024,
          level: 'extended',
          name: 'architecture',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Machine architecture of the ELF file.',
          type: 'keyword'
        },
        byte_order: {
          dashed_name: 'threat-indicator-file-elf-byte-order',
          description: 'Byte sequence of ELF file.',
          example: 'Little Endian',
          flat_name: 'threat.indicator.file.elf.byte_order',
          ignore_above: 1024,
          level: 'extended',
          name: 'byte_order',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Byte sequence of ELF file.',
          type: 'keyword'
        },
        cpu_type: {
          dashed_name: 'threat-indicator-file-elf-cpu-type',
          description: 'CPU type of the ELF file.',
          example: 'Intel',
          flat_name: 'threat.indicator.file.elf.cpu_type',
          ignore_above: 1024,
          level: 'extended',
          name: 'cpu_type',
          normalize: [],
          original_fieldset: 'elf',
          short: 'CPU type of the ELF file.',
          type: 'keyword'
        },
        creation_date: {
          dashed_name: 'threat-indicator-file-elf-creation-date',
          description: "Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.",
          flat_name: 'threat.indicator.file.elf.creation_date',
          level: 'extended',
          name: 'creation_date',
          normalize: [],
          original_fieldset: 'elf',
          short: 'Build or compile date.',
          type: 'date'
        },
        exports: {
          dashed_name: 'threat-indicator-file-elf-exports',
          description: 'List of exported element names and types.',
          flat_name: 'threat.indicator.file.elf.exports',
          level: 'extended',
          name: 'exports',
          normalize: [ 'array' ],
          original_fieldset: 'elf',
          short: 'List of exported element names and types.',
          type: 'flattened'
        },
        header: {
          abi_version: {
            dashed_name: 'threat-indicator-file-elf-header-abi-version',
            description: 'Version of the ELF Application Binary Interface (ABI).',
            flat_name: 'threat.indicator.file.elf.header.abi_version',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.abi_version',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Version of the ELF Application Binary Interface (ABI).',
            type: 'keyword'
          },
          class: {
            dashed_name: 'threat-indicator-file-elf-header-class',
            description: 'Header class of the ELF file.',
            flat_name: 'threat.indicator.file.elf.header.class',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.class',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Header class of the ELF file.',
            type: 'keyword'
          },
          data: {
            dashed_name: 'threat-indicator-file-elf-header-data',
            description: 'Data table of the ELF header.',
            flat_name: 'threat.indicator.file.elf.header.data',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.data',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Data table of the ELF header.',
            type: 'keyword'
          },
          entrypoint: {
            dashed_name: 'threat-indicator-file-elf-header-entrypoint',
            description: 'Header entrypoint of the ELF file.',
            flat_name: 'threat.indicator.file.elf.header.entrypoint',
            format: 'string',
            level: 'extended',
            name: 'header.entrypoint',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Header entrypoint of the ELF file.',
            type: 'long'
          },
          object_version: {
            dashed_name: 'threat-indicator-file-elf-header-object-version',
            description: '"0x1" for original ELF files.',
            flat_name: 'threat.indicator.file.elf.header.object_version',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.object_version',
            normalize: [],
            original_fieldset: 'elf',
            short: '"0x1" for original ELF files.',
            type: 'keyword'
          },
          os_abi: {
            dashed_name: 'threat-indicator-file-elf-header-os-abi',
            description: 'Application Binary Interface (ABI) of the Linux OS.',
            flat_name: 'threat.indicator.file.elf.header.os_abi',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.os_abi',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Application Binary Interface (ABI) of the Linux OS.',
            type: 'keyword'
          },
          type: {
            dashed_name: 'threat-indicator-file-elf-header-type',
            description: 'Header type of the ELF file.',
            flat_name: 'threat.indicator.file.elf.header.type',
            ignore_above: 1024,
            level: 'extended',
            name: 'header.type',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Header type of the ELF file.',
            type: 'keyword'
          },
          version: {
            dashed_name: 'threat-indicator-file-elf-header-version',
            description: 'Version of the ELF header.',
            flat_name: 'threat.indicator.file.elf.header.version',
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
          dashed_name: 'threat-indicator-file-elf-imports',
          description: 'List of imported element names and types.',
          flat_name: 'threat.indicator.file.elf.imports',
          level: 'extended',
          name: 'imports',
          normalize: [ 'array' ],
          original_fieldset: 'elf',
          short: 'List of imported element names and types.',
          type: 'flattened'
        },
        sections: {
          dashed_name: 'threat-indicator-file-elf-sections',
          description: 'An array containing an object for each section of the ELF file.\n' +
            'The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.',
          flat_name: 'threat.indicator.file.elf.sections',
          level: 'extended',
          name: {
            dashed_name: 'threat-indicator-file-elf-sections-name',
            description: 'ELF Section List name.',
            flat_name: 'threat.indicator.file.elf.sections.name',
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
            dashed_name: 'threat-indicator-file-elf-sections-type',
            description: 'ELF Section List type.',
            flat_name: 'threat.indicator.file.elf.sections.type',
            ignore_above: 1024,
            level: 'extended',
            name: 'sections.type',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF Section List type.',
            type: 'keyword'
          },
          chi2: {
            dashed_name: 'threat-indicator-file-elf-sections-chi2',
            description: 'Chi-square probability distribution of the section.',
            flat_name: 'threat.indicator.file.elf.sections.chi2',
            format: 'number',
            level: 'extended',
            name: 'sections.chi2',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Chi-square probability distribution of the section.',
            type: 'long'
          },
          entropy: {
            dashed_name: 'threat-indicator-file-elf-sections-entropy',
            description: 'Shannon entropy calculation from the section.',
            flat_name: 'threat.indicator.file.elf.sections.entropy',
            format: 'number',
            level: 'extended',
            name: 'sections.entropy',
            normalize: [],
            original_fieldset: 'elf',
            short: 'Shannon entropy calculation from the section.',
            type: 'long'
          },
          flags: {
            dashed_name: 'threat-indicator-file-elf-sections-flags',
            description: 'ELF Section List flags.',
            flat_name: 'threat.indicator.file.elf.sections.flags',
            ignore_above: 1024,
            level: 'extended',
            name: 'sections.flags',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF Section List flags.',
            type: 'keyword'
          },
          physical_offset: {
            dashed_name: 'threat-indicator-file-elf-sections-physical-offset',
            description: 'ELF Section List offset.',
            flat_name: 'threat.indicator.file.elf.sections.physical_offset',
            ignore_above: 1024,
            level: 'extended',
            name: 'sections.physical_offset',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF Section List offset.',
            type: 'keyword'
          },
          physical_size: {
            dashed_name: 'threat-indicator-file-elf-sections-physical-size',
            description: 'ELF Section List physical size.',
            flat_name: 'threat.indicator.file.elf.sections.physical_size',
            format: 'bytes',
            level: 'extended',
            name: 'sections.physical_size',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF Section List physical size.',
            type: 'long'
          },
          virtual_address: {
            dashed_name: 'threat-indicator-file-elf-sections-virtual-address',
            description: 'ELF Section List virtual address.',
            flat_name: 'threat.indicator.file.elf.sections.virtual_address',
            format: 'string',
            level: 'extended',
            name: 'sections.virtual_address',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF Section List virtual address.',
            type: 'long'
          },
          virtual_size: {
            dashed_name: 'threat-indicator-file-elf-sections-virtual-size',
            description: 'ELF Section List virtual size.',
            flat_name: 'threat.indicator.file.elf.sections.virtual_size',
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
          dashed_name: 'threat-indicator-file-elf-segments',
          description: 'An array containing an object for each segment of the ELF file.\n' +
            'The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.',
          flat_name: 'threat.indicator.file.elf.segments',
          level: 'extended',
          name: 'segments',
          normalize: [ 'array' ],
          original_fieldset: 'elf',
          short: 'ELF object segment list.',
          type: {
            dashed_name: 'threat-indicator-file-elf-segments-type',
            description: 'ELF object segment type.',
            flat_name: 'threat.indicator.file.elf.segments.type',
            ignore_above: 1024,
            level: 'extended',
            name: 'segments.type',
            normalize: [],
            original_fieldset: 'elf',
            short: 'ELF object segment type.',
            type: 'keyword'
          },
          sections: {
            dashed_name: 'threat-indicator-file-elf-segments-sections',
            description: 'ELF object segment sections.',
            flat_name: 'threat.indicator.file.elf.segments.sections',
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
          dashed_name: 'threat-indicator-file-elf-shared-libraries',
          description: 'List of shared libraries used by this ELF object.',
          flat_name: 'threat.indicator.file.elf.shared_libraries',
          ignore_above: 1024,
          level: 'extended',
          name: 'shared_libraries',
          normalize: [ 'array' ],
          original_fieldset: 'elf',
          short: 'List of shared libraries used by this ELF object.',
          type: 'keyword'
        },
        telfhash: {
          dashed_name: 'threat-indicator-file-elf-telfhash',
          description: 'telfhash symbol hash for ELF file.',
          flat_name: 'threat.indicator.file.elf.telfhash',
          ignore_above: 1024,
          level: 'extended',
          name: 'telfhash',
          normalize: [],
          original_fieldset: 'elf',
          short: 'telfhash hash for ELF file.',
          type: 'keyword'
        }
      },
      extension: {
        dashed_name: 'threat-indicator-file-extension',
        description: 'File extension, excluding the leading dot.\n' +
          'Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").',
        example: 'png',
        flat_name: 'threat.indicator.file.extension',
        ignore_above: 1024,
        level: 'extended',
        name: 'extension',
        normalize: [],
        original_fieldset: 'file',
        short: 'File extension, excluding the leading dot.',
        type: 'keyword'
      },
      fork_name: {
        dashed_name: 'threat-indicator-file-fork-name',
        description: 'A fork is additional data associated with a filesystem object.\n' +
          'On Linux, a resource fork is used to store additional data with a filesystem object. A file always has at least one fork for the data portion, and additional forks may exist.\n' +
          'On NTFS, this is analogous to an Alternate Data Stream (ADS), and the default data stream for a file is just called $DATA. Zone.Identifier is commonly used by Windows to track contents downloaded from the Internet. An ADS is typically of the form: `C:\\path\\to\\filename.extension:some_fork_name`, and `some_fork_name` is the value that should populate `fork_name`. `filename.extension` should populate `file.name`, and `extension` should populate `file.extension`. The full path, `file.path`, will include the fork name.',
        example: 'Zone.Identifer',
        flat_name: 'threat.indicator.file.fork_name',
        ignore_above: 1024,
        level: 'extended',
        name: 'fork_name',
        normalize: [],
        original_fieldset: 'file',
        short: 'A fork is additional data associated with a filesystem object.',
        type: 'keyword'
      },
      gid: {
        dashed_name: 'threat-indicator-file-gid',
        description: 'Primary group ID (GID) of the file.',
        example: '1001',
        flat_name: 'threat.indicator.file.gid',
        ignore_above: 1024,
        level: 'extended',
        name: 'gid',
        normalize: [],
        original_fieldset: 'file',
        short: 'Primary group ID (GID) of the file.',
        type: 'keyword'
      },
      group: {
        dashed_name: 'threat-indicator-file-group',
        description: 'Primary group name of the file.',
        example: 'alice',
        flat_name: 'threat.indicator.file.group',
        ignore_above: 1024,
        level: 'extended',
        name: 'group',
        normalize: [],
        original_fieldset: 'file',
        short: 'Primary group name of the file.',
        type: 'keyword'
      },
      hash: {
        md5: {
          dashed_name: 'threat-indicator-file-hash-md5',
          description: 'MD5 hash.',
          flat_name: 'threat.indicator.file.hash.md5',
          ignore_above: 1024,
          level: 'extended',
          name: 'md5',
          normalize: [],
          original_fieldset: 'hash',
          short: 'MD5 hash.',
          type: 'keyword'
        },
        sha1: {
          dashed_name: 'threat-indicator-file-hash-sha1',
          description: 'SHA1 hash.',
          flat_name: 'threat.indicator.file.hash.sha1',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha1',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA1 hash.',
          type: 'keyword'
        },
        sha256: {
          dashed_name: 'threat-indicator-file-hash-sha256',
          description: 'SHA256 hash.',
          flat_name: 'threat.indicator.file.hash.sha256',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha256',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA256 hash.',
          type: 'keyword'
        },
        sha384: {
          dashed_name: 'threat-indicator-file-hash-sha384',
          description: 'SHA384 hash.',
          flat_name: 'threat.indicator.file.hash.sha384',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha384',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA384 hash.',
          type: 'keyword'
        },
        sha512: {
          dashed_name: 'threat-indicator-file-hash-sha512',
          description: 'SHA512 hash.',
          flat_name: 'threat.indicator.file.hash.sha512',
          ignore_above: 1024,
          level: 'extended',
          name: 'sha512',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SHA512 hash.',
          type: 'keyword'
        },
        ssdeep: {
          dashed_name: 'threat-indicator-file-hash-ssdeep',
          description: 'SSDEEP hash.',
          flat_name: 'threat.indicator.file.hash.ssdeep',
          ignore_above: 1024,
          level: 'extended',
          name: 'ssdeep',
          normalize: [],
          original_fieldset: 'hash',
          short: 'SSDEEP hash.',
          type: 'keyword'
        },
        tlsh: {
          dashed_name: 'threat-indicator-file-hash-tlsh',
          description: 'TLSH hash.',
          flat_name: 'threat.indicator.file.hash.tlsh',
          ignore_above: 1024,
          level: 'extended',
          name: 'tlsh',
          normalize: [],
          original_fieldset: 'hash',
          short: 'TLSH hash.',
          type: 'keyword'
        }
      },
      inode: {
        dashed_name: 'threat-indicator-file-inode',
        description: 'Inode representing the file in the filesystem.',
        example: '256383',
        flat_name: 'threat.indicator.file.inode',
        ignore_above: 1024,
        level: 'extended',
        name: 'inode',
        normalize: [],
        original_fieldset: 'file',
        short: 'Inode representing the file in the filesystem.',
        type: 'keyword'
      },
      mime_type: {
        dashed_name: 'threat-indicator-file-mime-type',
        description: 'MIME type should identify the format of the file or stream of bytes using https://www.iana.org/assignments/media-types/media-types.xhtml[IANA official types], where possible. When more than one type is applicable, the most specific type should be used.',
        flat_name: 'threat.indicator.file.mime_type',
        ignore_above: 1024,
        level: 'extended',
        name: 'mime_type',
        normalize: [],
        original_fieldset: 'file',
        short: 'Media type of file, document, or arrangement of bytes.',
        type: 'keyword'
      },
      mode: {
        dashed_name: 'threat-indicator-file-mode',
        description: 'Mode of the file in octal representation.',
        example: '0640',
        flat_name: 'threat.indicator.file.mode',
        ignore_above: 1024,
        level: 'extended',
        name: 'mode',
        normalize: [],
        original_fieldset: 'file',
        short: 'Mode of the file in octal representation.',
        type: 'keyword'
      },
      mtime: {
        dashed_name: 'threat-indicator-file-mtime',
        description: 'Last time the file content was modified.',
        flat_name: 'threat.indicator.file.mtime',
        level: 'extended',
        name: 'mtime',
        normalize: [],
        original_fieldset: 'file',
        short: 'Last time the file content was modified.',
        type: 'date'
      },
      name: {
        dashed_name: 'threat-indicator-file-name',
        description: 'Name of the file including the extension, without the directory.',
        example: 'example.png',
        flat_name: 'threat.indicator.file.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'file',
        short: 'Name of the file including the extension, without the directory.',
        type: 'keyword'
      },
      owner: {
        dashed_name: 'threat-indicator-file-owner',
        description: "File owner's username.",
        example: 'alice',
        flat_name: 'threat.indicator.file.owner',
        ignore_above: 1024,
        level: 'extended',
        name: 'owner',
        normalize: [],
        original_fieldset: 'file',
        short: "File owner's username.",
        type: 'keyword'
      },
      path: {
        dashed_name: 'threat-indicator-file-path',
        description: 'Full path to the file, including the file name. It should include the drive letter, when appropriate.',
        example: '/home/alice/example.png',
        flat_name: 'threat.indicator.file.path',
        ignore_above: 1024,
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'threat.indicator.file.path.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'path',
        normalize: [],
        original_fieldset: 'file',
        short: 'Full path to the file, including the file name.',
        type: 'keyword'
      },
      pe: {
        architecture: {
          dashed_name: 'threat-indicator-file-pe-architecture',
          description: 'CPU architecture target for the file.',
          example: 'x64',
          flat_name: 'threat.indicator.file.pe.architecture',
          ignore_above: 1024,
          level: 'extended',
          name: 'architecture',
          normalize: [],
          original_fieldset: 'pe',
          short: 'CPU architecture target for the file.',
          type: 'keyword'
        },
        company: {
          dashed_name: 'threat-indicator-file-pe-company',
          description: 'Internal company name of the file, provided at compile-time.',
          example: 'Microsoft Corporation',
          flat_name: 'threat.indicator.file.pe.company',
          ignore_above: 1024,
          level: 'extended',
          name: 'company',
          normalize: [],
          original_fieldset: 'pe',
          short: 'Internal company name of the file, provided at compile-time.',
          type: 'keyword'
        },
        description: {
          dashed_name: 'threat-indicator-file-pe-description',
          description: 'Internal description of the file, provided at compile-time.',
          example: 'Paint',
          flat_name: 'threat.indicator.file.pe.description',
          ignore_above: 1024,
          level: 'extended',
          name: 'description',
          normalize: [],
          original_fieldset: 'pe',
          short: 'Internal description of the file, provided at compile-time.',
          type: 'keyword'
        },
        file_version: {
          dashed_name: 'threat-indicator-file-pe-file-version',
          description: 'Internal version of the file, provided at compile-time.',
          example: '6.3.9600.17415',
          flat_name: 'threat.indicator.file.pe.file_version',
          ignore_above: 1024,
          level: 'extended',
          name: 'file_version',
          normalize: [],
          original_fieldset: 'pe',
          short: 'Process name.',
          type: 'keyword'
        },
        imphash: {
          dashed_name: 'threat-indicator-file-pe-imphash',
          description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
            'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
          example: '0c6803c4e922103c4dca5963aad36ddf',
          flat_name: 'threat.indicator.file.pe.imphash',
          ignore_above: 1024,
          level: 'extended',
          name: 'imphash',
          normalize: [],
          original_fieldset: 'pe',
          short: 'A hash of the imports in a PE file.',
          type: 'keyword'
        },
        original_file_name: {
          dashed_name: 'threat-indicator-file-pe-original-file-name',
          description: 'Internal name of the file, provided at compile-time.',
          example: 'MSPAINT.EXE',
          flat_name: 'threat.indicator.file.pe.original_file_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'original_file_name',
          normalize: [],
          original_fieldset: 'pe',
          short: 'Internal name of the file, provided at compile-time.',
          type: 'keyword'
        },
        pehash: {
          dashed_name: 'threat-indicator-file-pe-pehash',
          description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
            'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
          example: '73ff189b63cd6be375a7ff25179a38d347651975',
          flat_name: 'threat.indicator.file.pe.pehash',
          ignore_above: 1024,
          level: 'extended',
          name: 'pehash',
          normalize: [],
          original_fieldset: 'pe',
          short: 'A hash of the PE header and data from one or more PE sections.',
          type: 'keyword'
        },
        product: {
          dashed_name: 'threat-indicator-file-pe-product',
          description: 'Internal product name of the file, provided at compile-time.',
          example: 'Microsoft® Windows® Operating System',
          flat_name: 'threat.indicator.file.pe.product',
          ignore_above: 1024,
          level: 'extended',
          name: 'product',
          normalize: [],
          original_fieldset: 'pe',
          short: 'Internal product name of the file, provided at compile-time.',
          type: 'keyword'
        }
      },
      size: {
        dashed_name: 'threat-indicator-file-size',
        description: 'File size in bytes.\nOnly relevant when `file.type` is "file".',
        example: 16384,
        flat_name: 'threat.indicator.file.size',
        level: 'extended',
        name: 'size',
        normalize: [],
        original_fieldset: 'file',
        short: 'File size in bytes.',
        type: 'long'
      },
      target_path: {
        dashed_name: 'threat-indicator-file-target-path',
        description: 'Target path for symlinks.',
        flat_name: 'threat.indicator.file.target_path',
        ignore_above: 1024,
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'threat.indicator.file.target_path.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'target_path',
        normalize: [],
        original_fieldset: 'file',
        short: 'Target path for symlinks.',
        type: 'keyword'
      },
      type: {
        dashed_name: 'threat-indicator-file-type',
        description: 'File type (file, dir, or symlink).',
        example: 'file',
        flat_name: 'threat.indicator.file.type',
        ignore_above: 1024,
        level: 'extended',
        name: 'type',
        normalize: [],
        original_fieldset: 'file',
        short: 'File type (file, dir, or symlink).',
        type: 'keyword'
      },
      uid: {
        dashed_name: 'threat-indicator-file-uid',
        description: 'The user ID (UID) or security identifier (SID) of the file owner.',
        example: '1001',
        flat_name: 'threat.indicator.file.uid',
        ignore_above: 1024,
        level: 'extended',
        name: 'uid',
        normalize: [],
        original_fieldset: 'file',
        short: 'The user ID (UID) or security identifier (SID) of the file owner.',
        type: 'keyword'
      },
      x509: {
        alternative_names: {
          dashed_name: 'threat-indicator-file-x509-alternative-names',
          description: 'List of subject alternative names (SAN). Name types vary by certificate authority and certificate type but commonly contain IP addresses, DNS names (and wildcards), and email addresses.',
          example: '*.elastic.co',
          flat_name: 'threat.indicator.file.x509.alternative_names',
          ignore_above: 1024,
          level: 'extended',
          name: 'alternative_names',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of subject alternative names (SAN).',
          type: 'keyword'
        },
        issuer: {
          common_name: {
            dashed_name: 'threat-indicator-file-x509-issuer-common-name',
            description: 'List of common name (CN) of issuing certificate authority.',
            example: 'Example SHA2 High Assurance Server CA',
            flat_name: 'threat.indicator.file.x509.issuer.common_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.common_name',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of common name (CN) of issuing certificate authority.',
            type: 'keyword'
          },
          country: {
            dashed_name: 'threat-indicator-file-x509-issuer-country',
            description: 'List of country (C) codes',
            example: 'US',
            flat_name: 'threat.indicator.file.x509.issuer.country',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.country',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of country (C) codes',
            type: 'keyword'
          },
          distinguished_name: {
            dashed_name: 'threat-indicator-file-x509-issuer-distinguished-name',
            description: 'Distinguished name (DN) of issuing certificate authority.',
            example: 'C=US, O=Example Inc, OU=www.example.com, CN=Example SHA2 High Assurance Server CA',
            flat_name: 'threat.indicator.file.x509.issuer.distinguished_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.distinguished_name',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Distinguished name (DN) of issuing certificate authority.',
            type: 'keyword'
          },
          locality: {
            dashed_name: 'threat-indicator-file-x509-issuer-locality',
            description: 'List of locality names (L)',
            example: 'Mountain View',
            flat_name: 'threat.indicator.file.x509.issuer.locality',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.locality',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of locality names (L)',
            type: 'keyword'
          },
          organization: {
            dashed_name: 'threat-indicator-file-x509-issuer-organization',
            description: 'List of organizations (O) of issuing certificate authority.',
            example: 'Example Inc',
            flat_name: 'threat.indicator.file.x509.issuer.organization',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.organization',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizations (O) of issuing certificate authority.',
            type: 'keyword'
          },
          organizational_unit: {
            dashed_name: 'threat-indicator-file-x509-issuer-organizational-unit',
            description: 'List of organizational units (OU) of issuing certificate authority.',
            example: 'www.example.com',
            flat_name: 'threat.indicator.file.x509.issuer.organizational_unit',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.organizational_unit',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizational units (OU) of issuing certificate authority.',
            type: 'keyword'
          },
          state_or_province: {
            dashed_name: 'threat-indicator-file-x509-issuer-state-or-province',
            description: 'List of state or province names (ST, S, or P)',
            example: 'California',
            flat_name: 'threat.indicator.file.x509.issuer.state_or_province',
            ignore_above: 1024,
            level: 'extended',
            name: 'issuer.state_or_province',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of state or province names (ST, S, or P)',
            type: 'keyword'
          }
        },
        not_after: {
          dashed_name: 'threat-indicator-file-x509-not-after',
          description: 'Time at which the certificate is no longer considered valid.',
          example: '2020-07-16T03:15:39Z',
          flat_name: 'threat.indicator.file.x509.not_after',
          level: 'extended',
          name: 'not_after',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Time at which the certificate is no longer considered valid.',
          type: 'date'
        },
        not_before: {
          dashed_name: 'threat-indicator-file-x509-not-before',
          description: 'Time at which the certificate is first considered valid.',
          example: '2019-08-16T01:40:25Z',
          flat_name: 'threat.indicator.file.x509.not_before',
          level: 'extended',
          name: 'not_before',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Time at which the certificate is first considered valid.',
          type: 'date'
        },
        public_key_algorithm: {
          dashed_name: 'threat-indicator-file-x509-public-key-algorithm',
          description: 'Algorithm used to generate the public key.',
          example: 'RSA',
          flat_name: 'threat.indicator.file.x509.public_key_algorithm',
          ignore_above: 1024,
          level: 'extended',
          name: 'public_key_algorithm',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Algorithm used to generate the public key.',
          type: 'keyword'
        },
        public_key_curve: {
          dashed_name: 'threat-indicator-file-x509-public-key-curve',
          description: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
          example: 'nistp521',
          flat_name: 'threat.indicator.file.x509.public_key_curve',
          ignore_above: 1024,
          level: 'extended',
          name: 'public_key_curve',
          normalize: [],
          original_fieldset: 'x509',
          short: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
          type: 'keyword'
        },
        public_key_exponent: {
          dashed_name: 'threat-indicator-file-x509-public-key-exponent',
          description: 'Exponent used to derive the public key. This is algorithm specific.',
          doc_values: false,
          example: 65537,
          flat_name: 'threat.indicator.file.x509.public_key_exponent',
          index: false,
          level: 'extended',
          name: 'public_key_exponent',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Exponent used to derive the public key. This is algorithm specific.',
          type: 'long'
        },
        public_key_size: {
          dashed_name: 'threat-indicator-file-x509-public-key-size',
          description: 'The size of the public key space in bits.',
          example: 2048,
          flat_name: 'threat.indicator.file.x509.public_key_size',
          level: 'extended',
          name: 'public_key_size',
          normalize: [],
          original_fieldset: 'x509',
          short: 'The size of the public key space in bits.',
          type: 'long'
        },
        serial_number: {
          dashed_name: 'threat-indicator-file-x509-serial-number',
          description: 'Unique serial number issued by the certificate authority. For consistency, if this value is alphanumeric, it should be formatted without colons and uppercase characters.',
          example: '55FBB9C7DEBF09809D12CCAA',
          flat_name: 'threat.indicator.file.x509.serial_number',
          ignore_above: 1024,
          level: 'extended',
          name: 'serial_number',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Unique serial number issued by the certificate authority.',
          type: 'keyword'
        },
        signature_algorithm: {
          dashed_name: 'threat-indicator-file-x509-signature-algorithm',
          description: 'Identifier for certificate signature algorithm. We recommend using names found in Go Lang Crypto library. See https://github.com/golang/go/blob/go1.14/src/crypto/x509/x509.go#L337-L353.',
          example: 'SHA256-RSA',
          flat_name: 'threat.indicator.file.x509.signature_algorithm',
          ignore_above: 1024,
          level: 'extended',
          name: 'signature_algorithm',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Identifier for certificate signature algorithm.',
          type: 'keyword'
        },
        subject: {
          common_name: {
            dashed_name: 'threat-indicator-file-x509-subject-common-name',
            description: 'List of common names (CN) of subject.',
            example: 'shared.global.example.net',
            flat_name: 'threat.indicator.file.x509.subject.common_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.common_name',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of common names (CN) of subject.',
            type: 'keyword'
          },
          country: {
            dashed_name: 'threat-indicator-file-x509-subject-country',
            description: 'List of country (C) code',
            example: 'US',
            flat_name: 'threat.indicator.file.x509.subject.country',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.country',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of country (C) code',
            type: 'keyword'
          },
          distinguished_name: {
            dashed_name: 'threat-indicator-file-x509-subject-distinguished-name',
            description: 'Distinguished name (DN) of the certificate subject entity.',
            example: 'C=US, ST=California, L=San Francisco, O=Example, Inc., CN=shared.global.example.net',
            flat_name: 'threat.indicator.file.x509.subject.distinguished_name',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.distinguished_name',
            normalize: [],
            original_fieldset: 'x509',
            short: 'Distinguished name (DN) of the certificate subject entity.',
            type: 'keyword'
          },
          locality: {
            dashed_name: 'threat-indicator-file-x509-subject-locality',
            description: 'List of locality names (L)',
            example: 'San Francisco',
            flat_name: 'threat.indicator.file.x509.subject.locality',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.locality',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of locality names (L)',
            type: 'keyword'
          },
          organization: {
            dashed_name: 'threat-indicator-file-x509-subject-organization',
            description: 'List of organizations (O) of subject.',
            example: 'Example, Inc.',
            flat_name: 'threat.indicator.file.x509.subject.organization',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.organization',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizations (O) of subject.',
            type: 'keyword'
          },
          organizational_unit: {
            dashed_name: 'threat-indicator-file-x509-subject-organizational-unit',
            description: 'List of organizational units (OU) of subject.',
            flat_name: 'threat.indicator.file.x509.subject.organizational_unit',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.organizational_unit',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of organizational units (OU) of subject.',
            type: 'keyword'
          },
          state_or_province: {
            dashed_name: 'threat-indicator-file-x509-subject-state-or-province',
            description: 'List of state or province names (ST, S, or P)',
            example: 'California',
            flat_name: 'threat.indicator.file.x509.subject.state_or_province',
            ignore_above: 1024,
            level: 'extended',
            name: 'subject.state_or_province',
            normalize: [ 'array' ],
            original_fieldset: 'x509',
            short: 'List of state or province names (ST, S, or P)',
            type: 'keyword'
          }
        },
        version_number: {
          dashed_name: 'threat-indicator-file-x509-version-number',
          description: 'Version of x509 format.',
          example: 3,
          flat_name: 'threat.indicator.file.x509.version_number',
          ignore_above: 1024,
          level: 'extended',
          name: 'version_number',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Version of x509 format.',
          type: 'keyword'
        }
      }
    },
    first_seen: {
      dashed_name: 'threat-indicator-first-seen',
      description: 'The date and time when intelligence source first reported sighting this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.first_seen',
      level: 'extended',
      name: 'indicator.first_seen',
      normalize: [],
      short: 'Date/time indicator was first reported.',
      type: 'date'
    },
    geo: {
      city_name: {
        dashed_name: 'threat-indicator-geo-city-name',
        description: 'City name.',
        example: 'Montreal',
        flat_name: 'threat.indicator.geo.city_name',
        ignore_above: 1024,
        level: 'core',
        name: 'city_name',
        normalize: [],
        original_fieldset: 'geo',
        short: 'City name.',
        type: 'keyword'
      },
      continent_code: {
        dashed_name: 'threat-indicator-geo-continent-code',
        description: "Two-letter code representing continent's name.",
        example: 'NA',
        flat_name: 'threat.indicator.geo.continent_code',
        ignore_above: 1024,
        level: 'core',
        name: 'continent_code',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Continent code.',
        type: 'keyword'
      },
      continent_name: {
        dashed_name: 'threat-indicator-geo-continent-name',
        description: 'Name of the continent.',
        example: 'North America',
        flat_name: 'threat.indicator.geo.continent_name',
        ignore_above: 1024,
        level: 'core',
        name: 'continent_name',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Name of the continent.',
        type: 'keyword'
      },
      country_iso_code: {
        dashed_name: 'threat-indicator-geo-country-iso-code',
        description: 'Country ISO code.',
        example: 'CA',
        flat_name: 'threat.indicator.geo.country_iso_code',
        ignore_above: 1024,
        level: 'core',
        name: 'country_iso_code',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Country ISO code.',
        type: 'keyword'
      },
      country_name: {
        dashed_name: 'threat-indicator-geo-country-name',
        description: 'Country name.',
        example: 'Canada',
        flat_name: 'threat.indicator.geo.country_name',
        ignore_above: 1024,
        level: 'core',
        name: 'country_name',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Country name.',
        type: 'keyword'
      },
      location: {
        dashed_name: 'threat-indicator-geo-location',
        description: 'Longitude and latitude.',
        example: '{ "lon": -73.614830, "lat": 45.505918 }',
        flat_name: 'threat.indicator.geo.location',
        level: 'core',
        name: 'location',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Longitude and latitude.',
        type: 'geo_point'
      },
      name: {
        dashed_name: 'threat-indicator-geo-name',
        description: 'User-defined description of a location, at the level of granularity they care about.\n' +
          'Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.\n' +
          'Not typically used in automated geolocation.',
        example: 'boston-dc',
        flat_name: 'threat.indicator.geo.name',
        ignore_above: 1024,
        level: 'extended',
        name: 'name',
        normalize: [],
        original_fieldset: 'geo',
        short: 'User-defined description of a location.',
        type: 'keyword'
      },
      postal_code: {
        dashed_name: 'threat-indicator-geo-postal-code',
        description: 'Postal code associated with the location.\n' +
          'Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.',
        example: 94040,
        flat_name: 'threat.indicator.geo.postal_code',
        ignore_above: 1024,
        level: 'core',
        name: 'postal_code',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Postal code.',
        type: 'keyword'
      },
      region_iso_code: {
        dashed_name: 'threat-indicator-geo-region-iso-code',
        description: 'Region ISO code.',
        example: 'CA-QC',
        flat_name: 'threat.indicator.geo.region_iso_code',
        ignore_above: 1024,
        level: 'core',
        name: 'region_iso_code',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Region ISO code.',
        type: 'keyword'
      },
      region_name: {
        dashed_name: 'threat-indicator-geo-region-name',
        description: 'Region name.',
        example: 'Quebec',
        flat_name: 'threat.indicator.geo.region_name',
        ignore_above: 1024,
        level: 'core',
        name: 'region_name',
        normalize: [],
        original_fieldset: 'geo',
        short: 'Region name.',
        type: 'keyword'
      },
      timezone: {
        dashed_name: 'threat-indicator-geo-timezone',
        description: 'The time zone of the location, such as IANA time zone name.',
        example: 'America/Argentina/Buenos_Aires',
        flat_name: 'threat.indicator.geo.timezone',
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
      dashed_name: 'threat-indicator-ip',
      description: 'Identifies a threat indicator as an IP address (irrespective of direction).',
      example: '1.2.3.4',
      flat_name: 'threat.indicator.ip',
      level: 'extended',
      name: 'indicator.ip',
      normalize: [],
      short: 'Indicator IP address',
      type: 'ip'
    },
    last_seen: {
      dashed_name: 'threat-indicator-last-seen',
      description: 'The date and time when intelligence source last reported sighting this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.last_seen',
      level: 'extended',
      name: 'indicator.last_seen',
      normalize: [],
      short: 'Date/time indicator was last reported.',
      type: 'date'
    },
    marking: {
      tlp: {
        dashed_name: 'threat-indicator-marking-tlp',
        description: 'Traffic Light Protocol sharing markings.\n' +
          'Recommended values are:\n' +
          '  * WHITE\n' +
          '  * GREEN\n' +
          '  * AMBER\n' +
          '  * RED',
        example: 'WHITE',
        flat_name: 'threat.indicator.marking.tlp',
        ignore_above: 1024,
        level: 'extended',
        name: 'indicator.marking.tlp',
        normalize: [],
        short: 'Indicator TLP marking',
        type: 'keyword'
      }
    },
    modified_at: {
      dashed_name: 'threat-indicator-modified-at',
      description: 'The date and time when intelligence source last modified information for this indicator.',
      example: '2020-11-05T17:25:47.000Z',
      flat_name: 'threat.indicator.modified_at',
      level: 'extended',
      name: 'indicator.modified_at',
      normalize: [],
      short: 'Date/time indicator was last updated.',
      type: 'date'
    },
    port: {
      dashed_name: 'threat-indicator-port',
      description: 'Identifies a threat indicator as a port number (irrespective of direction).',
      example: 443,
      flat_name: 'threat.indicator.port',
      level: 'extended',
      name: 'indicator.port',
      normalize: [],
      short: 'Indicator port',
      type: 'long'
    },
    provider: {
      dashed_name: 'threat-indicator-provider',
      description: "The name of the indicator's provider.",
      example: 'lrz_urlhaus',
      flat_name: 'threat.indicator.provider',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.provider',
      normalize: [],
      short: 'Indicator provider',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-indicator-reference',
      description: 'Reference URL linking to additional information about this indicator.',
      example: 'https://system.example.com/indicator/0001234',
      flat_name: 'threat.indicator.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.reference',
      normalize: [],
      short: 'Indicator reference URL',
      type: 'keyword'
    },
    registry: {
      data: {
        bytes: {
          dashed_name: 'threat-indicator-registry-data-bytes',
          description: 'Original bytes written with base64 encoding.\n' +
            'For Windows registry operations, such as SetValueEx and RegQueryValueEx, this corresponds to the data pointed by `lp_data`. This is optional but provides better recoverability and should be populated for REG_BINARY encoded values.',
          example: 'ZQBuAC0AVQBTAAAAZQBuAAAAAAA=',
          flat_name: 'threat.indicator.registry.data.bytes',
          ignore_above: 1024,
          level: 'extended',
          name: 'data.bytes',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Original bytes written with base64 encoding.',
          type: 'keyword'
        },
        strings: {
          dashed_name: 'threat-indicator-registry-data-strings',
          description: 'Content when writing string types.\n' +
            'Populated as an array when writing string data to the registry. For single string registry types (REG_SZ, REG_EXPAND_SZ), this should be an array with one string. For sequences of string with REG_MULTI_SZ, this array will be variable length. For numeric data, such as REG_DWORD and REG_QWORD, this should be populated with the decimal representation (e.g `"1"`).',
          example: '["C:\\rta\\red_ttp\\bin\\myapp.exe"]',
          flat_name: 'threat.indicator.registry.data.strings',
          level: 'core',
          name: 'data.strings',
          normalize: [ 'array' ],
          original_fieldset: 'registry',
          short: 'List of strings representing what was written to the registry.',
          type: 'wildcard'
        },
        type: {
          dashed_name: 'threat-indicator-registry-data-type',
          description: 'Standard registry type for encoding contents',
          example: 'REG_SZ',
          flat_name: 'threat.indicator.registry.data.type',
          ignore_above: 1024,
          level: 'core',
          name: 'data.type',
          normalize: [],
          original_fieldset: 'registry',
          short: 'Standard registry type for encoding contents',
          type: 'keyword'
        }
      },
      hive: {
        dashed_name: 'threat-indicator-registry-hive',
        description: 'Abbreviated name for the hive.',
        example: 'HKLM',
        flat_name: 'threat.indicator.registry.hive',
        ignore_above: 1024,
        level: 'core',
        name: 'hive',
        normalize: [],
        original_fieldset: 'registry',
        short: 'Abbreviated name for the hive.',
        type: 'keyword'
      },
      key: {
        dashed_name: 'threat-indicator-registry-key',
        description: 'Hive-relative path of keys.',
        example: 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe',
        flat_name: 'threat.indicator.registry.key',
        ignore_above: 1024,
        level: 'core',
        name: 'key',
        normalize: [],
        original_fieldset: 'registry',
        short: 'Hive-relative path of keys.',
        type: 'keyword'
      },
      path: {
        dashed_name: 'threat-indicator-registry-path',
        description: 'Full path, including hive, key and value',
        example: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\winword.exe\\Debugger',
        flat_name: 'threat.indicator.registry.path',
        ignore_above: 1024,
        level: 'core',
        name: 'path',
        normalize: [],
        original_fieldset: 'registry',
        short: 'Full path, including hive, key and value',
        type: 'keyword'
      },
      value: {
        dashed_name: 'threat-indicator-registry-value',
        description: 'Name of the value written.',
        example: 'Debugger',
        flat_name: 'threat.indicator.registry.value',
        ignore_above: 1024,
        level: 'core',
        name: 'value',
        normalize: [],
        original_fieldset: 'registry',
        short: 'Name of the value written.',
        type: 'keyword'
      }
    },
    scanner_stats: {
      dashed_name: 'threat-indicator-scanner-stats',
      description: 'Count of AV/EDR vendors that successfully detected malicious file or URL.',
      example: 4,
      flat_name: 'threat.indicator.scanner_stats',
      level: 'extended',
      name: 'indicator.scanner_stats',
      normalize: [],
      short: 'Scanner statistics',
      type: 'long'
    },
    sightings: {
      dashed_name: 'threat-indicator-sightings',
      description: 'Number of times this indicator was observed conducting threat activity.',
      example: 20,
      flat_name: 'threat.indicator.sightings',
      level: 'extended',
      name: 'indicator.sightings',
      normalize: [],
      short: 'Number of times indicator observed',
      type: 'long'
    },
    type: {
      dashed_name: 'threat-indicator-type',
      description: 'Type of indicator as represented by Cyber Observable in STIX 2.0.\n' +
        'Recommended values:\n' +
        '  * autonomous-system\n' +
        '  * artifact\n' +
        '  * directory\n' +
        '  * domain-name\n' +
        '  * email-addr\n' +
        '  * file\n' +
        '  * ipv4-addr\n' +
        '  * ipv6-addr\n' +
        '  * mac-addr\n' +
        '  * mutex\n' +
        '  * port\n' +
        '  * process\n' +
        '  * software\n' +
        '  * url\n' +
        '  * user-account\n' +
        '  * windows-registry-key\n' +
        '  * x509-certificate',
      example: 'ipv4-addr',
      flat_name: 'threat.indicator.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'indicator.type',
      normalize: [],
      short: 'Type of indicator',
      type: 'keyword'
    },
    url: {
      domain: {
        dashed_name: 'threat-indicator-url-domain',
        description: 'Domain of the url, such as "www.elastic.co".\n' +
          'In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.\n' +
          'If the URL contains a literal IPv6 address enclosed by `[` and `]` (IETF RFC 2732), the `[` and `]` characters should also be captured in the `domain` field.',
        example: 'www.elastic.co',
        flat_name: 'threat.indicator.url.domain',
        ignore_above: 1024,
        level: 'extended',
        name: 'domain',
        normalize: [],
        original_fieldset: 'url',
        short: 'Domain of the url.',
        type: 'keyword'
      },
      extension: {
        dashed_name: 'threat-indicator-url-extension',
        description: 'The field contains the file extension from the original request url, excluding the leading dot.\n' +
          'The file extension is only set if it exists, as not every url has a file extension.\n' +
          'The leading period must not be included. For example, the value must be "png", not ".png".\n' +
          'Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").',
        example: 'png',
        flat_name: 'threat.indicator.url.extension',
        ignore_above: 1024,
        level: 'extended',
        name: 'extension',
        normalize: [],
        original_fieldset: 'url',
        short: 'File extension from the request url, excluding the leading dot.',
        type: 'keyword'
      },
      fragment: {
        dashed_name: 'threat-indicator-url-fragment',
        description: 'Portion of the url after the `#`, such as "top".\n' +
          'The `#` is not part of the fragment.',
        flat_name: 'threat.indicator.url.fragment',
        ignore_above: 1024,
        level: 'extended',
        name: 'fragment',
        normalize: [],
        original_fieldset: 'url',
        short: 'Portion of the url after the `#`.',
        type: 'keyword'
      },
      full: {
        dashed_name: 'threat-indicator-url-full',
        description: 'If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.',
        example: 'https://www.elastic.co:443/search?q=elasticsearch#top',
        flat_name: 'threat.indicator.url.full',
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'threat.indicator.url.full.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'full',
        normalize: [],
        original_fieldset: 'url',
        short: 'Full unparsed URL.',
        type: 'wildcard'
      },
      original: {
        dashed_name: 'threat-indicator-url-original',
        description: 'Unmodified original url as seen in the event source.\n' +
          'Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path.\n' +
          'This field is meant to represent the URL as it was observed, complete or not.',
        example: 'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
        flat_name: 'threat.indicator.url.original',
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'threat.indicator.url.original.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'original',
        normalize: [],
        original_fieldset: 'url',
        short: 'Unmodified original url as seen in the event source.',
        type: 'wildcard'
      },
      password: {
        dashed_name: 'threat-indicator-url-password',
        description: 'Password of the request.',
        flat_name: 'threat.indicator.url.password',
        ignore_above: 1024,
        level: 'extended',
        name: 'password',
        normalize: [],
        original_fieldset: 'url',
        short: 'Password of the request.',
        type: 'keyword'
      },
      path: {
        dashed_name: 'threat-indicator-url-path',
        description: 'Path of the request, such as "/search".',
        flat_name: 'threat.indicator.url.path',
        level: 'extended',
        name: 'path',
        normalize: [],
        original_fieldset: 'url',
        short: 'Path of the request, such as "/search".',
        type: 'wildcard'
      },
      port: {
        dashed_name: 'threat-indicator-url-port',
        description: 'Port of the request, such as 443.',
        example: 443,
        flat_name: 'threat.indicator.url.port',
        format: 'string',
        level: 'extended',
        name: 'port',
        normalize: [],
        original_fieldset: 'url',
        short: 'Port of the request, such as 443.',
        type: 'long'
      },
      query: {
        dashed_name: 'threat-indicator-url-query',
        description: 'The query field describes the query string of the request, such as "q=elasticsearch".\n' +
          'The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.',
        flat_name: 'threat.indicator.url.query',
        ignore_above: 1024,
        level: 'extended',
        name: 'query',
        normalize: [],
        original_fieldset: 'url',
        short: 'Query string of the request.',
        type: 'keyword'
      },
      registered_domain: {
        dashed_name: 'threat-indicator-url-registered-domain',
        description: 'The highest registered url domain, stripped of the subdomain.\n' +
          'For example, the registered domain for "foo.example.com" is "example.com".\n' +
          'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".',
        example: 'example.com',
        flat_name: 'threat.indicator.url.registered_domain',
        ignore_above: 1024,
        level: 'extended',
        name: 'registered_domain',
        normalize: [],
        original_fieldset: 'url',
        short: 'The highest registered url domain, stripped of the subdomain.',
        type: 'keyword'
      },
      scheme: {
        dashed_name: 'threat-indicator-url-scheme',
        description: 'Scheme of the request, such as "https".\n' +
          'Note: The `:` is not part of the scheme.',
        example: 'https',
        flat_name: 'threat.indicator.url.scheme',
        ignore_above: 1024,
        level: 'extended',
        name: 'scheme',
        normalize: [],
        original_fieldset: 'url',
        short: 'Scheme of the url.',
        type: 'keyword'
      },
      subdomain: {
        dashed_name: 'threat-indicator-url-subdomain',
        description: 'The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.\n' +
          'For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.',
        example: 'east',
        flat_name: 'threat.indicator.url.subdomain',
        ignore_above: 1024,
        level: 'extended',
        name: 'subdomain',
        normalize: [],
        original_fieldset: 'url',
        short: 'The subdomain of the domain.',
        type: 'keyword'
      },
      top_level_domain: {
        dashed_name: 'threat-indicator-url-top-level-domain',
        description: 'The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".\n' +
          'This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".',
        example: 'co.uk',
        flat_name: 'threat.indicator.url.top_level_domain',
        ignore_above: 1024,
        level: 'extended',
        name: 'top_level_domain',
        normalize: [],
        original_fieldset: 'url',
        short: 'The effective top level domain (com, org, net, co.uk).',
        type: 'keyword'
      },
      username: {
        dashed_name: 'threat-indicator-url-username',
        description: 'Username of the request.',
        flat_name: 'threat.indicator.url.username',
        ignore_above: 1024,
        level: 'extended',
        name: 'username',
        normalize: [],
        original_fieldset: 'url',
        short: 'Username of the request.',
        type: 'keyword'
      }
    },
    x509: {
      alternative_names: {
        dashed_name: 'threat-indicator-x509-alternative-names',
        description: 'List of subject alternative names (SAN). Name types vary by certificate authority and certificate type but commonly contain IP addresses, DNS names (and wildcards), and email addresses.',
        example: '*.elastic.co',
        flat_name: 'threat.indicator.x509.alternative_names',
        ignore_above: 1024,
        level: 'extended',
        name: 'alternative_names',
        normalize: [ 'array' ],
        original_fieldset: 'x509',
        short: 'List of subject alternative names (SAN).',
        type: 'keyword'
      },
      issuer: {
        common_name: {
          dashed_name: 'threat-indicator-x509-issuer-common-name',
          description: 'List of common name (CN) of issuing certificate authority.',
          example: 'Example SHA2 High Assurance Server CA',
          flat_name: 'threat.indicator.x509.issuer.common_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.common_name',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of common name (CN) of issuing certificate authority.',
          type: 'keyword'
        },
        country: {
          dashed_name: 'threat-indicator-x509-issuer-country',
          description: 'List of country (C) codes',
          example: 'US',
          flat_name: 'threat.indicator.x509.issuer.country',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.country',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of country (C) codes',
          type: 'keyword'
        },
        distinguished_name: {
          dashed_name: 'threat-indicator-x509-issuer-distinguished-name',
          description: 'Distinguished name (DN) of issuing certificate authority.',
          example: 'C=US, O=Example Inc, OU=www.example.com, CN=Example SHA2 High Assurance Server CA',
          flat_name: 'threat.indicator.x509.issuer.distinguished_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.distinguished_name',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Distinguished name (DN) of issuing certificate authority.',
          type: 'keyword'
        },
        locality: {
          dashed_name: 'threat-indicator-x509-issuer-locality',
          description: 'List of locality names (L)',
          example: 'Mountain View',
          flat_name: 'threat.indicator.x509.issuer.locality',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.locality',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of locality names (L)',
          type: 'keyword'
        },
        organization: {
          dashed_name: 'threat-indicator-x509-issuer-organization',
          description: 'List of organizations (O) of issuing certificate authority.',
          example: 'Example Inc',
          flat_name: 'threat.indicator.x509.issuer.organization',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.organization',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of organizations (O) of issuing certificate authority.',
          type: 'keyword'
        },
        organizational_unit: {
          dashed_name: 'threat-indicator-x509-issuer-organizational-unit',
          description: 'List of organizational units (OU) of issuing certificate authority.',
          example: 'www.example.com',
          flat_name: 'threat.indicator.x509.issuer.organizational_unit',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.organizational_unit',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of organizational units (OU) of issuing certificate authority.',
          type: 'keyword'
        },
        state_or_province: {
          dashed_name: 'threat-indicator-x509-issuer-state-or-province',
          description: 'List of state or province names (ST, S, or P)',
          example: 'California',
          flat_name: 'threat.indicator.x509.issuer.state_or_province',
          ignore_above: 1024,
          level: 'extended',
          name: 'issuer.state_or_province',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of state or province names (ST, S, or P)',
          type: 'keyword'
        }
      },
      not_after: {
        dashed_name: 'threat-indicator-x509-not-after',
        description: 'Time at which the certificate is no longer considered valid.',
        example: '2020-07-16T03:15:39Z',
        flat_name: 'threat.indicator.x509.not_after',
        level: 'extended',
        name: 'not_after',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Time at which the certificate is no longer considered valid.',
        type: 'date'
      },
      not_before: {
        dashed_name: 'threat-indicator-x509-not-before',
        description: 'Time at which the certificate is first considered valid.',
        example: '2019-08-16T01:40:25Z',
        flat_name: 'threat.indicator.x509.not_before',
        level: 'extended',
        name: 'not_before',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Time at which the certificate is first considered valid.',
        type: 'date'
      },
      public_key_algorithm: {
        dashed_name: 'threat-indicator-x509-public-key-algorithm',
        description: 'Algorithm used to generate the public key.',
        example: 'RSA',
        flat_name: 'threat.indicator.x509.public_key_algorithm',
        ignore_above: 1024,
        level: 'extended',
        name: 'public_key_algorithm',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Algorithm used to generate the public key.',
        type: 'keyword'
      },
      public_key_curve: {
        dashed_name: 'threat-indicator-x509-public-key-curve',
        description: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
        example: 'nistp521',
        flat_name: 'threat.indicator.x509.public_key_curve',
        ignore_above: 1024,
        level: 'extended',
        name: 'public_key_curve',
        normalize: [],
        original_fieldset: 'x509',
        short: 'The curve used by the elliptic curve public key algorithm. This is algorithm specific.',
        type: 'keyword'
      },
      public_key_exponent: {
        dashed_name: 'threat-indicator-x509-public-key-exponent',
        description: 'Exponent used to derive the public key. This is algorithm specific.',
        doc_values: false,
        example: 65537,
        flat_name: 'threat.indicator.x509.public_key_exponent',
        index: false,
        level: 'extended',
        name: 'public_key_exponent',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Exponent used to derive the public key. This is algorithm specific.',
        type: 'long'
      },
      public_key_size: {
        dashed_name: 'threat-indicator-x509-public-key-size',
        description: 'The size of the public key space in bits.',
        example: 2048,
        flat_name: 'threat.indicator.x509.public_key_size',
        level: 'extended',
        name: 'public_key_size',
        normalize: [],
        original_fieldset: 'x509',
        short: 'The size of the public key space in bits.',
        type: 'long'
      },
      serial_number: {
        dashed_name: 'threat-indicator-x509-serial-number',
        description: 'Unique serial number issued by the certificate authority. For consistency, if this value is alphanumeric, it should be formatted without colons and uppercase characters.',
        example: '55FBB9C7DEBF09809D12CCAA',
        flat_name: 'threat.indicator.x509.serial_number',
        ignore_above: 1024,
        level: 'extended',
        name: 'serial_number',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Unique serial number issued by the certificate authority.',
        type: 'keyword'
      },
      signature_algorithm: {
        dashed_name: 'threat-indicator-x509-signature-algorithm',
        description: 'Identifier for certificate signature algorithm. We recommend using names found in Go Lang Crypto library. See https://github.com/golang/go/blob/go1.14/src/crypto/x509/x509.go#L337-L353.',
        example: 'SHA256-RSA',
        flat_name: 'threat.indicator.x509.signature_algorithm',
        ignore_above: 1024,
        level: 'extended',
        name: 'signature_algorithm',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Identifier for certificate signature algorithm.',
        type: 'keyword'
      },
      subject: {
        common_name: {
          dashed_name: 'threat-indicator-x509-subject-common-name',
          description: 'List of common names (CN) of subject.',
          example: 'shared.global.example.net',
          flat_name: 'threat.indicator.x509.subject.common_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.common_name',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of common names (CN) of subject.',
          type: 'keyword'
        },
        country: {
          dashed_name: 'threat-indicator-x509-subject-country',
          description: 'List of country (C) code',
          example: 'US',
          flat_name: 'threat.indicator.x509.subject.country',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.country',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of country (C) code',
          type: 'keyword'
        },
        distinguished_name: {
          dashed_name: 'threat-indicator-x509-subject-distinguished-name',
          description: 'Distinguished name (DN) of the certificate subject entity.',
          example: 'C=US, ST=California, L=San Francisco, O=Example, Inc., CN=shared.global.example.net',
          flat_name: 'threat.indicator.x509.subject.distinguished_name',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.distinguished_name',
          normalize: [],
          original_fieldset: 'x509',
          short: 'Distinguished name (DN) of the certificate subject entity.',
          type: 'keyword'
        },
        locality: {
          dashed_name: 'threat-indicator-x509-subject-locality',
          description: 'List of locality names (L)',
          example: 'San Francisco',
          flat_name: 'threat.indicator.x509.subject.locality',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.locality',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of locality names (L)',
          type: 'keyword'
        },
        organization: {
          dashed_name: 'threat-indicator-x509-subject-organization',
          description: 'List of organizations (O) of subject.',
          example: 'Example, Inc.',
          flat_name: 'threat.indicator.x509.subject.organization',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.organization',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of organizations (O) of subject.',
          type: 'keyword'
        },
        organizational_unit: {
          dashed_name: 'threat-indicator-x509-subject-organizational-unit',
          description: 'List of organizational units (OU) of subject.',
          flat_name: 'threat.indicator.x509.subject.organizational_unit',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.organizational_unit',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of organizational units (OU) of subject.',
          type: 'keyword'
        },
        state_or_province: {
          dashed_name: 'threat-indicator-x509-subject-state-or-province',
          description: 'List of state or province names (ST, S, or P)',
          example: 'California',
          flat_name: 'threat.indicator.x509.subject.state_or_province',
          ignore_above: 1024,
          level: 'extended',
          name: 'subject.state_or_province',
          normalize: [ 'array' ],
          original_fieldset: 'x509',
          short: 'List of state or province names (ST, S, or P)',
          type: 'keyword'
        }
      },
      version_number: {
        dashed_name: 'threat-indicator-x509-version-number',
        description: 'Version of x509 format.',
        example: 3,
        flat_name: 'threat.indicator.x509.version_number',
        ignore_above: 1024,
        level: 'extended',
        name: 'version_number',
        normalize: [],
        original_fieldset: 'x509',
        short: 'Version of x509 format.',
        type: 'keyword'
      }
    }
  },
  software: {
    alias: {
      dashed_name: 'threat-software-alias',
      description: 'The alias(es) of the software for a set of related intrusion activity that are tracked by a common name in the security community.\n' +
        'While not required, you can use a MITRE ATT&CK® associated software description.',
      example: '[ "X-Agent" ]',
      flat_name: 'threat.software.alias',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.alias',
      normalize: [ 'array' ],
      short: 'Alias of the software',
      type: 'keyword'
    },
    id: {
      dashed_name: 'threat-software-id',
      description: 'The id of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software id.',
      example: 'S0552',
      flat_name: 'threat.software.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.id',
      normalize: [],
      short: 'ID of the software',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-software-name',
      description: 'The name of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software name.',
      example: 'AdFind',
      flat_name: 'threat.software.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.name',
      normalize: [],
      short: 'Name of the software.',
      type: 'keyword'
    },
    platforms: {
      dashed_name: 'threat-software-platforms',
      description: 'The platforms of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'Recommended Values:\n' +
        '  * AWS\n' +
        '  * Azure\n' +
        '  * Azure AD\n' +
        '  * GCP\n' +
        '  * Linux\n' +
        '  * macOS\n' +
        '  * Network\n' +
        '  * Office 365\n' +
        '  * SaaS\n' +
        '  * Windows\n' +
        '\n' +
        'While not required, you can use a MITRE ATT&CK® software platforms.',
      example: '[ "Windows" ]',
      flat_name: 'threat.software.platforms',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.platforms',
      normalize: [ 'array' ],
      short: 'Platforms of the software.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-software-reference',
      description: 'The reference URL of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'While not required, you can use a MITRE ATT&CK® software reference URL.',
      example: 'https://attack.mitre.org/software/S0552/',
      flat_name: 'threat.software.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.reference',
      normalize: [],
      short: 'Software reference URL.',
      type: 'keyword'
    },
    type: {
      dashed_name: 'threat-software-type',
      description: 'The type of software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.\n' +
        'Recommended values\n' +
        '  * Malware\n' +
        '  * Tool\n' +
        '\n' +
        ' While not required, you can use a MITRE ATT&CK® software type.',
      example: 'Tool',
      flat_name: 'threat.software.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'software.type',
      normalize: [],
      short: 'Software type.',
      type: 'keyword'
    }
  },
  tactic: {
    id: {
      dashed_name: 'threat-tactic-id',
      description: 'The id of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )',
      example: 'TA0002',
      flat_name: 'threat.tactic.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.id',
      normalize: [ 'array' ],
      short: 'Threat tactic id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-tactic-name',
      description: 'Name of the type of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/)',
      example: 'Execution',
      flat_name: 'threat.tactic.name',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.name',
      normalize: [ 'array' ],
      short: 'Threat tactic.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-tactic-reference',
      description: 'The reference url of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )',
      example: 'https://attack.mitre.org/tactics/TA0002/',
      flat_name: 'threat.tactic.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'tactic.reference',
      normalize: [ 'array' ],
      short: 'Threat tactic URL reference.',
      type: 'keyword'
    }
  },
  technique: {
    id: {
      dashed_name: 'threat-technique-id',
      description: 'The id of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'T1059',
      flat_name: 'threat.technique.id',
      ignore_above: 1024,
      level: 'extended',
      name: 'technique.id',
      normalize: [ 'array' ],
      short: 'Threat technique id.',
      type: 'keyword'
    },
    name: {
      dashed_name: 'threat-technique-name',
      description: 'The name of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'Command and Scripting Interpreter',
      flat_name: 'threat.technique.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'threat.technique.name.text',
          name: 'text',
          type: 'match_only_text'
        }
      ],
      name: 'technique.name',
      normalize: [ 'array' ],
      short: 'Threat technique name.',
      type: 'keyword'
    },
    reference: {
      dashed_name: 'threat-technique-reference',
      description: 'The reference url of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)',
      example: 'https://attack.mitre.org/techniques/T1059/',
      flat_name: 'threat.technique.reference',
      ignore_above: 1024,
      level: 'extended',
      name: 'technique.reference',
      normalize: [ 'array' ],
      short: 'Threat technique URL reference.',
      type: 'keyword'
    },
    subtechnique: {
      id: {
        dashed_name: 'threat-technique-subtechnique-id',
        description: 'The full id of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)',
        example: 'T1059.001',
        flat_name: 'threat.technique.subtechnique.id',
        ignore_above: 1024,
        level: 'extended',
        name: 'technique.subtechnique.id',
        normalize: [ 'array' ],
        short: 'Threat subtechnique id.',
        type: 'keyword'
      },
      name: {
        dashed_name: 'threat-technique-subtechnique-name',
        description: 'The name of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)',
        example: 'PowerShell',
        flat_name: 'threat.technique.subtechnique.name',
        ignore_above: 1024,
        level: 'extended',
        multi_fields: [
          {
            flat_name: 'threat.technique.subtechnique.name.text',
            name: 'text',
            type: 'match_only_text'
          }
        ],
        name: 'technique.subtechnique.name',
        normalize: [ 'array' ],
        short: 'Threat subtechnique name.',
        type: 'keyword'
      },
      reference: {
        dashed_name: 'threat-technique-subtechnique-reference',
        description: 'The reference url of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)',
        example: 'https://attack.mitre.org/techniques/T1059/001/',
        flat_name: 'threat.technique.subtechnique.reference',
        ignore_above: 1024,
        level: 'extended',
        name: 'technique.subtechnique.reference',
        normalize: [ 'array' ],
        short: 'Threat subtechnique URL reference.',
        type: 'keyword'
      }
    }
  }
}