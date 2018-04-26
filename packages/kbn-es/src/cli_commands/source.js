const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');

exports.description = 'Build and run from source';

exports.help = (defaults = {}) => {
  const {
    license = 'basic',
    password = 'changeme',
    'base-path': basePath,
  } = defaults;

  return dedent`
    Options:

      --license       Run with a 'oss', 'basic', or 'trial' license [default: ${license}]
      --source-path   Path to ES source [default: ${defaults['source-path']}]
      --base-path     Path containing cache/installations [default: ${basePath}]
      --install-path  Installation path, defaults to 'source' within base-path
      --password      Sets password for elastic user [default: ${password}]
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
