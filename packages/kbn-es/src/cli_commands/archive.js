const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');
const { createCliError } = require('../errors');

exports.description = 'Install and run from an Elasticsearch tar';

exports.usage = 'es archive <path> [<args>]';

exports.help = (defaults = {}) => {
  const { password = 'changeme', 'base-path': basePath } = defaults;

  return dedent`
    Options:

      --base-path     Path containing cache/installations [default: ${basePath}]
      --install-path  Installation path, defaults to 'source' within base-path
      --password      Sets password for elastic user [default: ${password}]
      -E              Additional key=value settings to pass to Elasticsearch

    Example:

      es archive ../elasticsearch.tar.gz -E cluster.name=test -E path.data=/tmp/es-data
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
  const [, path] = options._;

  if (!path || !path.endsWith('tar.gz')) {
    throw createCliError('you must provide a path to an ES tar file');
  }

  const { installPath } = await cluster.installArchive(path, options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
