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

const startCase = require('lodash.startcase');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const execa = require('execa');
const chalk = require('chalk');

const pkg = require('../package.json');
const kibanaPkgPath = require.resolve('../../../package.json');
const kibanaPkg = require(kibanaPkgPath); // eslint-disable-line import/no-dynamic-require

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
        default: kibanaPkg.version,
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
      generateScss: {
        type: 'confirm',
        message: 'Should SCSS be used?',
        when: answers => answers.generateApp,
        default: true,
      },
    },
    filters: {
      'public/**/*': 'generateApp',
      'translations/**/*': 'generateTranslations',
      '.i18nrc.json': 'generateTranslations',
      'public/hack.js': 'generateHack',
      'server/**/*': 'generateApi',
      'public/app.scss': 'generateScss',
      '.kibana-plugin-helpers.json': 'generateScss',
    },
    move: {
      gitignore: '.gitignore',
      'eslintrc.js': '.eslintrc.js',
      'package_template.json': 'package.json',
    },
    data: answers =>
      Object.assign(
        {
          templateVersion: pkg.version,
          startCase,
          camelCase,
          snakeCase,
          name,
        },
        answers
      ),
    enforceNewFolder: true,
    installDependencies: false,
    gitInit: true,
    async post({ log }) {
      await execa('yarn', ['kbn', 'bootstrap'], {
        cwd: KBN_DIR,
        stdio: 'inherit',
      });

      const dir = relative(process.cwd(), resolve(KBN_DIR, 'plugins', snakeCase(name)));

      try {
        await execa('yarn', ['lint', '--fix'], {
          cwd: dir,
          all: true,
        });
      } catch (error) {
        throw new Error(`Failure when running prettier on the generated output: ${error.all}`);
      }

      log.success(chalk`🎉

Your plugin has been created in {bold ${dir}}. Move into that directory to run it:

  {bold cd "${dir}"}
  {bold yarn start}
`);
    },
  };
};
