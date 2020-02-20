/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
      i: 'internal',
    },
  });

  if (!options.help && options._.length !== 1) {
    console.log(chalk`{red {bold [name]} is a required argument}\n`);
    options.help = true;
  }

  if (options.help) {
    console.log(
      dedent(chalk`
        # {dim Usage:} 
        node scripts/generate-plugin {bold [name]}
        Generate a fresh Kibana plugin in the plugins/ directory
      `) + '\n'
    );
    process.exit(1);
  }

  const name = options._[0];
  const template = resolve(__dirname, './sao_template');
  const kibanaPlugins = resolve(process.cwd(), 'plugins');
  const targetPath = resolve(kibanaPlugins, snakeCase(name));

  sao({
    template: template,
    targetPath: targetPath,
    configOptions: {
      name,
      targetPath,
    },
  }).catch(error => {
    console.error(chalk`{red fatal error}!`);
    console.error(error.stack);
    process.exit(1);
  });
};
