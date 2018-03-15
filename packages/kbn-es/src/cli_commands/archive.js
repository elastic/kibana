const dedent = require('dedent');
const getopts = require('getopts');
const chalk = require('chalk');
const { Cluster } = require('../cluster');

exports.description = 'Install and run from an Elasticsearch tar';

exports.usage = 'es archive <path> [<args>]';

const help = dedent`
  Options:

    --install-path  Directory to install to
    -E              Additional key=value settings to pass to Elasticsearch

  Example:

    es archive ../elasticsearch.tar.gz -E cluster.name=test -E path.data=/tmp/es-data
`;
exports.help = help;

exports.run = async argv => {
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      esArgs: 'E',
    },
  });

  const cluster = new Cluster();
  const [, path] = options._;

  if (!path || !path.endsWith('tar.gz')) {
    console.warn('you must provide a path to an ES tar file');
    return;
  }

  try {
    const { installPath } = await cluster.installArchive(path, options);
    await cluster.run(installPath, { esArgs: options.esArgs });
  } catch (e) {
    console.log(chalk.red(e.stack));
  }
};
