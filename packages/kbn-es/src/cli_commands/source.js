const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');

exports.description = 'Build and run from source';

exports.help = (defaults = {}) => {
  return dedent`
    Options:

      --source-path   Path to ES source [default: ${defaults['source-path']}]
      --base-path     Path containing cache/installations [default: ${
        defaults['base-path']
      }]
      --install-path  Installation path, defaults to 'source' within base-path
      -E              Additional key=value settings to pass to Elasticsearch

    Example:

      es snapshot --source-path=../elasticsearch -E cluster.name=test -E path.data=/tmp/es-data
  `;
};

exports.run = async (defaults = {}) => {
  const argv = process.argv.slice(2);
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      sourcePath: 'source-path',
      esArgs: 'E',
    },

    default: defaults,
  });

  const cluster = new Cluster();
  const { installPath } = await cluster.installSource(options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
