export const peEcs = {
  architecture: {
    dashed_name: 'pe-architecture',
    description: 'CPU architecture target for the file.',
    example: 'x64',
    flat_name: 'pe.architecture',
    ignore_above: 1024,
    level: 'extended',
    name: 'architecture',
    normalize: [],
    short: 'CPU architecture target for the file.',
    type: 'keyword'
  },
  company: {
    dashed_name: 'pe-company',
    description: 'Internal company name of the file, provided at compile-time.',
    example: 'Microsoft Corporation',
    flat_name: 'pe.company',
    ignore_above: 1024,
    level: 'extended',
    name: 'company',
    normalize: [],
    short: 'Internal company name of the file, provided at compile-time.',
    type: 'keyword'
  },
  description: {
    dashed_name: 'pe-description',
    description: 'Internal description of the file, provided at compile-time.',
    example: 'Paint',
    flat_name: 'pe.description',
    ignore_above: 1024,
    level: 'extended',
    name: 'description',
    normalize: [],
    short: 'Internal description of the file, provided at compile-time.',
    type: 'keyword'
  },
  file_version: {
    dashed_name: 'pe-file-version',
    description: 'Internal version of the file, provided at compile-time.',
    example: '6.3.9600.17415',
    flat_name: 'pe.file_version',
    ignore_above: 1024,
    level: 'extended',
    name: 'file_version',
    normalize: [],
    short: 'Process name.',
    type: 'keyword'
  },
  imphash: {
    dashed_name: 'pe-imphash',
    description: 'A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.\n' +
      'Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.',
    example: '0c6803c4e922103c4dca5963aad36ddf',
    flat_name: 'pe.imphash',
    ignore_above: 1024,
    level: 'extended',
    name: 'imphash',
    normalize: [],
    short: 'A hash of the imports in a PE file.',
    type: 'keyword'
  },
  original_file_name: {
    dashed_name: 'pe-original-file-name',
    description: 'Internal name of the file, provided at compile-time.',
    example: 'MSPAINT.EXE',
    flat_name: 'pe.original_file_name',
    ignore_above: 1024,
    level: 'extended',
    name: 'original_file_name',
    normalize: [],
    short: 'Internal name of the file, provided at compile-time.',
    type: 'keyword'
  },
  pehash: {
    dashed_name: 'pe-pehash',
    description: 'A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.\n' +
      'Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.',
    example: '73ff189b63cd6be375a7ff25179a38d347651975',
    flat_name: 'pe.pehash',
    ignore_above: 1024,
    level: 'extended',
    name: 'pehash',
    normalize: [],
    short: 'A hash of the PE header and data from one or more PE sections.',
    type: 'keyword'
  },
  product: {
    dashed_name: 'pe-product',
    description: 'Internal product name of the file, provided at compile-time.',
    example: 'Microsoft® Windows® Operating System',
    flat_name: 'pe.product',
    ignore_above: 1024,
    level: 'extended',
    name: 'product',
    normalize: [],
    short: 'Internal product name of the file, provided at compile-time.',
    type: 'keyword'
  }
}