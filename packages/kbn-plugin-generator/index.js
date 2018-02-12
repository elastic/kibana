const { resolve } = require('path');

const dedent = require('dedent');
const sao = require('sao');
const chalk = require('chalk');
const getopts = require('getopts');
const snakeCase = require('lodash.snakecase');

exports.run = function run(argv) {
  const options = getopts(argv, {
    alias: {
      h: 'help',
    },
  });

  if (!options.help && options._.length !== 1) {
    console.log(chalk`{red {bold [name]} is a required argument}\n`);
    options.help = true;
  }

  if (options.help) {
    console.log(
      dedent(chalk`
        {dim usage:} node scripts/generate-plugin {bold [name]}

        generate a fresh Kibana plugin in the ../kibana-extra/ directory
      `) + '\n'
    );
    process.exit(1);
  }

  const name = options._[0];
  const template = resolve(__dirname, './sao_template');
  const kibanaExtra = resolve(__dirname, '../../../kibana-extra');
  const targetPath = resolve(kibanaExtra, snakeCase(name));

  sao({
    template: template,
    targetPath: targetPath,
    configOptions: {
      name,
    },
  }).catch(error => {
    console.error(chalk`{red fatal error}!`);
    console.error(error.stack);
    process.exit(1);
  });
};
