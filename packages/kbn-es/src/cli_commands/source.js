const dedent = require('dedent');
const getopts = require('getopts');
const chalk = require('chalk');
const { Cluster } = require('../cluster');

exports.description = 'Build and run from source';

exports.help = dedent`
  Options:

    --source-path   Absolute path to Elasticsearch source
    --install-path  Directory to install to
    -E              Additional key=value settings to pass to Elasticsearch
`;

exports.run = async argv => {
  const options = getopts(argv, {
    alias: {
      basePath: 'base-path',
      installPath: 'install-path',
      sourcePath: 'source-path',
      esArgs: 'E',
    },
  });

  const cluster = new Cluster();

  try {
    const { installPath } = await cluster.installSource(options);
    await cluster.run(installPath, { esArgs: options.esArgs });
  } catch (e) {
    console.log(chalk.red(e.stack));
  }
};
