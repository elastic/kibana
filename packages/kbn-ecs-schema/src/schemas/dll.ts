export const dllEcs = {
  code_signature: {
    digest_algorithm: {
      dashed_name: 'dll-code-signature-digest-algorithm',
      description: 'The hashing algorithm used to sign the process.\n' +
        'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
      example: 'sha256',
      flat_name: 'dll.code_signature.digest_algorithm',
      ignore_above: 1024,
      level: 'extended',
      name: 'digest_algorithm',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Hashing algorithm used to sign the process.',
      type: 'keyword'
    },
    exists: {
      dashed_name: 'dll-code-signature-exists',
      description: 'Boolean to capture if a signature is present.',
      example: 'true',
      flat_name: 'dll.code_signature.exists',
      level: 'core',
      name: 'exists',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Boolean to capture if a signature is present.',
      type: 'boolean'
    },
    signing_id: {
      dashed_name: 'dll-code-signature-signing-id',
      description: 'The identifier used to sign the process.\n' +
        'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
      example: 'com.apple.xpc.proxy',
      flat_name: 'dll.code_signature.signing_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'signing_id',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'The identifier used to sign the process.',
      type: 'keyword'
    },
    status: {
      dashed_name: 'dll-code-signature-status',
      description: 'Additional information about the certificate status.\n' +
        'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
      example: 'ERROR_UNTRUSTED_ROOT',
      flat_name: 'dll.code_signature.status',
      ignore_above: 1024,
      level: 'extended',
      name: 'status',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Additional information about the certificate status.',
      type: 'keyword'
    },
    subject_name: {
      dashed_name: 'dll-code-signature-subject-name',
      description: 'Subject name of the code signer',
      example: 'Microsoft Corporation',
      flat_name: 'dll.code_signature.subject_name',
      ignore_above: 1024,
      level: 'core',
      name: 'subject_name',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Subject name of the code signer',
      type: 'keyword'
    },
    team_id: {
      dashed_name: 'dll-code-signature-team-id',
      description: 'The team identifier used to sign the process.\n' +
        'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
      example: 'EQHXZ8M8AV',
      flat_name: 'dll.code_signature.team_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'team_id',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'The team identifier used to sign the process.',
      type: 'keyword'
    },
    timestamp: {
      dashed_name: 'dll-code-signature-timestamp',
      description: 'Date and time when the code signature was generated and signed.',
      example: '2021-01-01T12:10:30Z',
      flat_name: 'dll.code_signature.timestamp',
      level: 'extended',
      name: 'timestamp',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'When the signature was generated and signed.',
      type: 'date'
    },
    trusted: {
      dashed_name: 'dll-code-signature-trusted',
      description: 'Stores the trust status of the certificate chain.\n' +
        'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
      example: 'true',
      flat_name: 'dll.code_signature.trusted',
      level: 'extended',
      name: 'trusted',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Stores the trust status of the certificate chain.',
      type: 'boolean'
    },
    valid: {
      dashed_name: 'dll-code-signature-valid',
      description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
        'Leave unpopulated if a certificate was unchecked.',
      example: 'true',
      flat_name: 'dll.code_signature.valid',
      level: 'extended',
      name: 'valid',
      normalize: [],
      original_fieldset: 'code_signature',
      short: 'Boolean to capture if the digital signature is verified against the binary content.',
      type: 'boolean'
    }
  },
  hash: {
    md5: {
      dashed_name: 'dll-hash-md5',
      description: 'MD5 hash.',
      flat_name: 'dll.hash.md5',
      ignore_above: 1024,
      level: 'extended',
      name: 'md5',
      normalize: [],
      original_fieldset: 'hash',
      short: 'MD5 hash.',
      type: 'keyword'
    },
    sha1: {
      dashed_name: 'dll-hash-sha1',
      description: 'SHA1 hash.',
      flat_name: 'dll.hash.sha1',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha1',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA1 hash.',
      type: 'keyword'
    },
    sha256: {
      dashed_name: 'dll-hash-sha256',
      description: 'SHA256 hash.',
      flat_name: 'dll.hash.sha256',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha256',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA256 hash.',
      type: 'keyword'
    },
    sha384: {
      dashed_name: 'dll-hash-sha384',
      description: 'SHA384 hash.',
      flat_name: 'dll.hash.sha384',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha384',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA384 hash.',
      type: 'keyword'
    },
    sha512: {
      dashed_name: 'dll-hash-sha512',
      description: 'SHA512 hash.',
      flat_name: 'dll.hash.sha512',
      ignore_above: 1024,
      level: 'extended',
      name: 'sha512',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SHA512 hash.',
      type: 'keyword'
    },
    ssdeep: {
      dashed_name: 'dll-hash-ssdeep',
      description: 'SSDEEP hash.',
      flat_name: 'dll.hash.ssdeep',
      ignore_above: 1024,
      level: 'extended',
      name: 'ssdeep',
      normalize: [],
      original_fieldset: 'hash',
      short: 'SSDEEP hash.',
      type: 'keyword'
    },
    tlsh: {
      dashed_name: 'dll-hash-tlsh',
      description: 'TLSH hash.',
      flat_name: 'dll.hash.tlsh',
      ignore_above: 1024,
      level: 'extended',
      name: 'tlsh',
      normalize: [],
      original_fieldset: 'hash',
      short: 'TLSH hash.',
      type: 'keyword'
    }
  },
  name: {
    dashed_name: 'dll-name',
    description: 'Name of the library.\n' +
      'This generally maps to the name of the file on disk.',
    example: 'kernel32.dll',
    flat_name: 'dll.name',
    ignore_above: 1024,
    level: 'core',
    name: 'name',
    normalize: [],
    short: 'Name of the library.',
    type: 'keyword'
  },
  path: {
    dashed_name: 'dll-path',
    description: 'Full file path of the library.',
    example: 'C:\\Windows\\System32\\kernel32.dll',
    flat_name: 'dll.path',
    ignore_above: 1024,
    level: 'extended',
    name: 'path',
    normalize: [],
    short: 'Full file path of the library.',
    type: 'keyword'
  },
  pe: {
    architecture: {
      dashed_name: 'dll-pe-architecture',
      description: 'CPU architecture target for the file.',
      example: 'x64',
      flat_name: 'dll.pe.architecture',
      ignore_above: 1024,
      level: 'extended',
      name: 'architecture',
      normalize: [],
      original_fieldset: 'pe',
      short: 'CPU architecture target for the file.',
      type: 'keyword'
    },
    company: {
      dashed_name: 'dll-pe-company',
      description: 'Internal company name of the file, provided at compile-time.',
      example: 'Microsoft Corporation',
      flat_name: 'dll.pe.company',
      ignore_above: 1024,
      level: 'extended',
      name: 'company',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal company name of the file, provided at compile-time.',
      type: 'keyword'
    },
    description: {
      dashed_name: 'dll-pe-description',
      description: 'Internal description of the file, provided at compile-time.',
      example: 'Paint',
      flat_name: 'dll.pe.description',
      ignore_above: 1024,
      level: 'extended',
      name: 'description',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal description of the file, provided at compile-time.',
      type: 'keyword'
    },
    file_version: {
      dashed_name: 'dll-pe-file-version',
      description: 'Internal version of the file, provided at compile-time.',
      example: '6.3.9600.17415',
      flat_name: 'dll.pe.file_version',
      ignore_above: 1024,
      level: 'extended',
      name: 'file_version',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Process name.',
      type: 'keyword'
    },
    imphash: {
      dashed_name: 'dll-pe-imphash',
      description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
        'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
      example: '0c6803c4e922103c4dca5963aad36ddf',
      flat_name: 'dll.pe.imphash',
      ignore_above: 1024,
      level: 'extended',
      name: 'imphash',
      normalize: [],
      original_fieldset: 'pe',
      short: 'A hash of the imports in a PE file.',
      type: 'keyword'
    },
    original_file_name: {
      dashed_name: 'dll-pe-original-file-name',
      description: 'Internal name of the file, provided at compile-time.',
      example: 'MSPAINT.EXE',
      flat_name: 'dll.pe.original_file_name',
      ignore_above: 1024,
      level: 'extended',
      name: 'original_file_name',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal name of the file, provided at compile-time.',
      type: 'keyword'
    },
    pehash: {
      dashed_name: 'dll-pe-pehash',
      description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
        'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
      example: '73ff189b63cd6be375a7ff25179a38d347651975',
      flat_name: 'dll.pe.pehash',
      ignore_above: 1024,
      level: 'extended',
      name: 'pehash',
      normalize: [],
      original_fieldset: 'pe',
      short: 'A hash of the PE header and data from one or more PE sections.',
      type: 'keyword'
    },
    product: {
      dashed_name: 'dll-pe-product',
      description: 'Internal product name of the file, provided at compile-time.',
      example: 'Microsoft® Windows® Operating System',
      flat_name: 'dll.pe.product',
      ignore_above: 1024,
      level: 'extended',
      name: 'product',
      normalize: [],
      original_fieldset: 'pe',
      short: 'Internal product name of the file, provided at compile-time.',
      type: 'keyword'
    }
  }
}