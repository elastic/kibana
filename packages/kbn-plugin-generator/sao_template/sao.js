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

const { resolve, relative, dirname } = require('path');

const kebabCase = require('lodash.kebabcase');
const startCase = require('lodash.startcase');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const execa = require('execa');
const chalk = require('chalk');

const pkg = require('../package.json');
const kibanaPkgPath = require.resolve('../../../package.json');
const kibanaPkg = require(kibanaPkgPath);

const KBN_DIR = dirname(kibanaPkgPath);

module.exports = function({ name }) {
  return {
    prompts: {
      description: {
        message: 'Provide a short description',
        default: 'An awesome Kibana plugin',
      },
      kbnVersion: {
        message: 'What Kibana version are you targeting?',
        default: kibanaPkg.branch,
      },
      generateApp: {
        type: 'confirm',
        message: 'Should an app component be generated?',
        default: true,
      },
      generateTranslations: {
        type: 'confirm',
        message: 'Should translation files be generated?',
        default: true,
      },
      generateHack: {
        type: 'confirm',
        message: 'Should a hack component be generated?',
        default: true,
      },
      generateApi: {
        type: 'confirm',
        message: 'Should a server API be generated?',
        default: true,
      },
    },
    filters: {
      'public/**/*': 'generateApp',
      'translations/**/*': 'generateTranslations',
      'public/hack.js': 'generateHack',
      'server/**/*': 'generateApi',
    },
    move: {
      gitignore: '.gitignore',
      eslintrc: '.eslintrc',
    },
    data: answers =>
      Object.assign(
        {
          templateVersion: pkg.version,
          kebabCase,
          startCase,
          camelCase,
          name,
        },
        answers
      ),
    enforceNewFolder: true,
    installDependencies: false,
    gitInit: true,
    post({ log }) {
      return execa('yarn', ['kbn', 'bootstrap'], {
        cwd: KBN_DIR,
        stdio: 'inherit',
      }).then(() => {
        const dir = relative(
          process.cwd(),
          resolve(KBN_DIR, `../kibana-extra`, snakeCase(name))
        );

        log.success(chalk`🎉

  Your plugin has been created in {bold ${dir}}. Move into that directory to run it:

    {bold cd "${dir}"}
    {bold yarn start}
`);
      });
    },
  };
};
