export const packageEcs = {
  architecture: {
    dashed_name: 'package-architecture',
    description: 'Package architecture.',
    example: 'x86_64',
    flat_name: 'package.architecture',
    ignore_above: 1024,
    level: 'extended',
    name: 'architecture',
    normalize: [],
    short: 'Package architecture.',
    type: 'keyword'
  },
  build_version: {
    dashed_name: 'package-build-version',
    description: 'Additional information about the build version of the installed package.\n' +
      'For example use the commit SHA of a non-released package.',
    example: '36f4f7e89dd61b0988b12ee000b98966867710cd',
    flat_name: 'package.build_version',
    ignore_above: 1024,
    level: 'extended',
    name: 'build_version',
    normalize: [],
    short: 'Build version information',
    type: 'keyword'
  },
  checksum: {
    dashed_name: 'package-checksum',
    description: 'Checksum of the installed package for verification.',
    example: '68b329da9893e34099c7d8ad5cb9c940',
    flat_name: 'package.checksum',
    ignore_above: 1024,
    level: 'extended',
    name: 'checksum',
    normalize: [],
    short: 'Checksum of the installed package for verification.',
    type: 'keyword'
  },
  description: {
    dashed_name: 'package-description',
    description: 'Description of the package.',
    example: 'Open source programming language to build simple/reliable/efficient software.',
    flat_name: 'package.description',
    ignore_above: 1024,
    level: 'extended',
    name: 'description',
    normalize: [],
    short: 'Description of the package.',
    type: 'keyword'
  },
  install_scope: {
    dashed_name: 'package-install-scope',
    description: 'Indicating how the package was installed, e.g. user-local, global.',
    example: 'global',
    flat_name: 'package.install_scope',
    ignore_above: 1024,
    level: 'extended',
    name: 'install_scope',
    normalize: [],
    short: 'Indicating how the package was installed, e.g. user-local, global.',
    type: 'keyword'
  },
  installed: {
    dashed_name: 'package-installed',
    description: 'Time when package was installed.',
    flat_name: 'package.installed',
    level: 'extended',
    name: 'installed',
    normalize: [],
    short: 'Time when package was installed.',
    type: 'date'
  },
  license: {
    dashed_name: 'package-license',
    description: 'License under which the package was released.\n' +
      'Use a short name, e.g. the license identifier from SPDX License List where possible (https://spdx.org/licenses/).',
    example: 'Apache License 2.0',
    flat_name: 'package.license',
    ignore_above: 1024,
    level: 'extended',
    name: 'license',
    normalize: [],
    short: 'Package license',
    type: 'keyword'
  },
  name: {
    dashed_name: 'package-name',
    description: 'Package name',
    example: 'go',
    flat_name: 'package.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Package name',
    type: 'keyword'
  },
  path: {
    dashed_name: 'package-path',
    description: 'Path where the package is installed.',
    example: '/usr/local/Cellar/go/1.12.9/',
    flat_name: 'package.path',
    ignore_above: 1024,
    level: 'extended',
    name: 'path',
    normalize: [],
    short: 'Path where the package is installed.',
    type: 'keyword'
  },
  reference: {
    dashed_name: 'package-reference',
    description: 'Home page or reference URL of the software in this package, if available.',
    example: 'https://golang.org',
    flat_name: 'package.reference',
    ignore_above: 1024,
    level: 'extended',
    name: 'reference',
    normalize: [],
    short: 'Package home page or reference URL',
    type: 'keyword'
  },
  size: {
    dashed_name: 'package-size',
    description: 'Package size in bytes.',
    example: 62231,
    flat_name: 'package.size',
    format: 'string',
    level: 'extended',
    name: 'size',
    normalize: [],
    short: 'Package size in bytes.',
    type: 'long'
  },
  type: {
    dashed_name: 'package-type',
    description: 'Type of package.\n' +
      'This should contain the package file type, rather than the package manager name. Examples: rpm, dpkg, brew, npm, gem, nupkg, jar.',
    example: 'rpm',
    flat_name: 'package.type',
    ignore_above: 1024,
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'Package type',
    type: 'keyword'
  },
  version: {
    dashed_name: 'package-version',
    description: 'Package version',
    example: '1.12.9',
    flat_name: 'package.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'Package version',
    type: 'keyword'
  }
}