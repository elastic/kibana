const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');

exports.description = 'Downloads and run from a nightly snapshot';

exports.help = (defaults = {}) => {
  return dedent`
    Options:

      --version       Version of ES to download [default: ${defaults.version}]
      --base-path     Path containing cache/installations [default: ${
        defaults['base-path']
      }]
      --install-path  Installation path, defaults to 'source' within base-path
      -E              Additional key=value settings to pass to Elasticsearch

    Example:

      es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      esArgs: 'E',
    },

    default: defaults,
  });

  const cluster = new Cluster();
  const { installPath } = await cluster.installSnapshot(options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
