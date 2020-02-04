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

const { relative } = require('path');

const startCase = require('lodash.startcase');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const chalk = require('chalk');
const execa = require('execa');

const pkg = require('../package.json');
const kibanaPkgPath = require.resolve('../../../package.json');
const kibanaPkg = require(kibanaPkgPath); // eslint-disable-line import/no-dynamic-require

module.exports = function({ name, targetPath, isKibanaPlugin }) {
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
      generateApi: {
        type: 'confirm',
        message: 'Should a server API be generated?',
        default: true,
      },
      // generateTranslations: {
      //   type: 'confirm',
      //   message: 'Should translation files be generated?',
      //   default: true,
      // },
      generateScss: {
        type: 'confirm',
        message: 'Should SCSS be used?',
        when: answers => answers.generateApp,
        default: true,
      },
      generateEslint: {
        type: 'confirm',
        message: 'Would you like to use a custom eslint file?',
        default: !isKibanaPlugin,
      },
    },
    filters: {
      'public/**/index.scss': 'generateScss',
      'public/**/*': 'generateApp',
      'server/**/*': 'generateApi',
      // 'translations/**/*': 'generateTranslations',
      // '.i18nrc.json': 'generateTranslations',
      'eslintrc.js': 'generateEslint',
    },
    move: {
      'eslintrc.js': '.eslintrc.js',
    },
    data: answers =>
      Object.assign(
        {
          templateVersion: pkg.version,
          startCase,
          camelCase,
          snakeCase,
          name,
          isKibanaPlugin,
          kbnVersion: answers.kbnVersion,
          upperCamelCaseName: name.charAt(0).toUpperCase() + camelCase(name).slice(1),
          hasUi: !!answers.generateApp,
          hasServer: !!answers.generateApi,
          hasScss: !!answers.generateScss,
          relRoot: isKibanaPlugin ? '../../../..' : '../../..',
        },
        answers
      ),
    enforceNewFolder: true,
    installDependencies: false,
    gitInit: !isKibanaPlugin,
    async post({ log }) {
      const dir = relative(process.cwd(), targetPath);

      // Apply eslint to the generated plugin
      try {
        await execa('yarn', ['lint:es', `./${dir}/**/*.ts*`, '--no-ignore', '--fix']);
      } catch (error) {
        console.error(error);
        throw new Error(
          `Failure when running prettier on the generated output: ${error.all || error}`
        );
      }

      log.success(chalk`🎉

Your plugin has been created in {bold ${dir}}.

  {bold yarn start}
`);
    },
  };
};
