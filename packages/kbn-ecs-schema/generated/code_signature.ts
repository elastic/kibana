export const code_signatureEcs = {
  digest_algorithm: {
    dashed_name: 'code-signature-digest-algorithm',
    description: 'The hashing algorithm used to sign the process.\n' +
      'This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.',
    example: 'sha256',
    flat_name: 'code_signature.digest_algorithm',
    ignore_above: 1024,
    level: 'extended',
    name: 'digest_algorithm',
    normalize: [],
    short: 'Hashing algorithm used to sign the process.',
    type: 'keyword'
  },
  exists: {
    dashed_name: 'code-signature-exists',
    description: 'Boolean to capture if a signature is present.',
    example: 'true',
    flat_name: 'code_signature.exists',
    level: 'core',
    name: 'exists',
    normalize: [],
    short: 'Boolean to capture if a signature is present.',
    type: 'boolean'
  },
  signing_id: {
    dashed_name: 'code-signature-signing-id',
    description: 'The identifier used to sign the process.\n' +
      'This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.',
    example: 'com.apple.xpc.proxy',
    flat_name: 'code_signature.signing_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'signing_id',
    normalize: [],
    short: 'The identifier used to sign the process.',
    type: 'keyword'
  },
  status: {
    dashed_name: 'code-signature-status',
    description: 'Additional information about the certificate status.\n' +
      'This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.',
    example: 'ERROR_UNTRUSTED_ROOT',
    flat_name: 'code_signature.status',
    ignore_above: 1024,
    level: 'extended',
    name: 'status',
    normalize: [],
    short: 'Additional information about the certificate status.',
    type: 'keyword'
  },
  subject_name: {
    dashed_name: 'code-signature-subject-name',
    description: 'Subject name of the code signer',
    example: 'Microsoft Corporation',
    flat_name: 'code_signature.subject_name',
    ignore_above: 1024,
    level: 'core',
    name: 'subject_name',
    normalize: [],
    short: 'Subject name of the code signer',
    type: 'keyword'
  },
  team_id: {
    dashed_name: 'code-signature-team-id',
    description: 'The team identifier used to sign the process.\n' +
      'This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.',
    example: 'EQHXZ8M8AV',
    flat_name: 'code_signature.team_id',
    ignore_above: 1024,
    level: 'extended',
    name: 'team_id',
    normalize: [],
    short: 'The team identifier used to sign the process.',
    type: 'keyword'
  },
  timestamp: {
    dashed_name: 'code-signature-timestamp',
    description: 'Date and time when the code signature was generated and signed.',
    example: '2021-01-01T12:10:30Z',
    flat_name: 'code_signature.timestamp',
    level: 'extended',
    name: 'timestamp',
    normalize: [],
    short: 'When the signature was generated and signed.',
    type: 'date'
  },
  trusted: {
    dashed_name: 'code-signature-trusted',
    description: 'Stores the trust status of the certificate chain.\n' +
      'Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.',
    example: 'true',
    flat_name: 'code_signature.trusted',
    level: 'extended',
    name: 'trusted',
    normalize: [],
    short: 'Stores the trust status of the certificate chain.',
    type: 'boolean'
  },
  valid: {
    dashed_name: 'code-signature-valid',
    description: 'Boolean to capture if the digital signature is verified against the binary content.\n' +
      'Leave unpopulated if a certificate was unchecked.',
    example: 'true',
    flat_name: 'code_signature.valid',
    level: 'extended',
    name: 'valid',
    normalize: [],
    short: 'Boolean to capture if the digital signature is verified against the binary content.',
    type: 'boolean'
  }
}