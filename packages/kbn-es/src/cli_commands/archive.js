const dedent = require('dedent');
const getopts = require('getopts');
const { Cluster } = require('../cluster');

exports.description = 'Install and run from an Elasticsearch tar';

exports.usage = 'es archive <path> [<args>]';

exports.help = (defaults = {}) => {
  return dedent`
    Options:

      --base-path     Path containing cache/installations [default: ${
        defaults['base-path']
      }]
      --install-path  Installation path, defaults to 'source' within base-path
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
    console.warn('you must provide a path to an ES tar file');
    return;
  }

  const { installPath } = await cluster.installArchive(path, options);
  await cluster.run(installPath, { esArgs: options.esArgs });
};
