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

const { relative, resolve } = require('path');
const fs = require('fs');

const startCase = require('lodash.startcase');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const chalk = require('chalk');
const execa = require('execa');

const pkg = require('../package.json');
const kibanaPkgPath = require.resolve('../../../package.json');
const kibanaPkg = require(kibanaPkgPath); // eslint-disable-line import/no-dynamic-require

async function gitInit(dir) {
  // Only plugins in /plugins get git init
  try {
    await execa('git', ['init', dir]);
    console.log(`Git repo initialized in ${dir}`);
  } catch (error) {
    console.error(error);
    throw new Error(`Failure to git init ${dir}: ${error.all || error}`);
  }
}

async function moveToCustomFolder(from, to) {
  try {
    await execa('mv', [from, to]);
  } catch (error) {
    console.error(error);
    throw new Error(`Failure to move plugin to ${to}: ${error.all || error}`);
  }
}

async function eslintPlugin(dir) {
  try {
    await execa('yarn', ['lint:es', `./${dir}/**/*.ts*`, '--no-ignore', '--fix']);
  } catch (error) {
    console.error(error);
    throw new Error(`Failure when running prettier on the generated output: ${error.all || error}`);
  }
}

module.exports = function({ name, targetPath }) {
  return {
    prompts: {
      customPath: {
        message: 'Would you like to create the plugin in a different folder?',
        default: '/plugins',
        filter(value) {
          // Keep default value empty
          if (value === '/plugins') return '';
          // Remove leading slash
          return value.startsWith('/') ? value.slice(1) : value;
        },
        validate(customPath) {
          const p = resolve(process.cwd(), customPath);
          const exists = fs.existsSync(p);
          if (!exists)
            return `Folder should exist relative to the kibana root folder. Consider /src/plugins or /x-pack/plugins.`;
          return true;
        },
      },
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
      generateTranslations: {
        type: 'confirm',
        when: answers => {
          // only for 3rd party plugins
          return !answers.customPath && answers.generateApp;
        },
        message: 'Should translation files be generated?',
        default({ customPath }) {
          // only for 3rd party plugins
          return !customPath;
        },
      },
      generateScss: {
        type: 'confirm',
        message: 'Should SCSS be used?',
        when: answers => answers.generateApp,
        default: true,
      },
      generateEslint: {
        type: 'confirm',
        message: 'Would you like to use a custom eslint file?',
        default({ customPath }) {
          return !customPath;
        },
      },
    },
    filters: {
      'public/**/index.scss': 'generateScss',
      'public/**/*': 'generateApp',
      'server/**/*': 'generateApi',
      'translations/**/*': 'generateTranslations',
      'i18nrc.json': 'generateTranslations',
      'eslintrc.js': 'generateEslint',
    },
    move: {
      'eslintrc.js': '.eslintrc.js',
      'i18nrc.json': '.i18nrc.json',
    },
    data: answers =>
      Object.assign(
        {
          templateVersion: pkg.version,
          startCase,
          camelCase,
          snakeCase,
          name,
          // kibana plugins are placed in a the non default path
          isKibanaPlugin: !answers.customPath,
          kbnVersion: answers.kbnVersion,
          upperCamelCaseName: name.charAt(0).toUpperCase() + camelCase(name).slice(1),
          hasUi: !!answers.generateApp,
          hasServer: !!answers.generateApi,
          hasScss: !!answers.generateScss,
          relRoot: relative(
            resolve(answers.customPath || targetPath, name, 'public'),
            process.cwd()
          ),
        },
        answers
      ),
    enforceNewFolder: true,
    installDependencies: false,
    async post({ log, answers }) {
      let dir = relative(process.cwd(), targetPath);
      if (answers.customPath) {
        // Move to custom path
        moveToCustomFolder(targetPath, answers.customPath);
        dir = relative(process.cwd(), resolve(answers.customPath, snakeCase(name)));
      } else {
        // Init git only in the default path
        await gitInit(dir);
      }

      // Apply eslint to the generated plugin
      eslintPlugin(dir);

      log.success(chalk`🎉

Your plugin has been created in {bold ${dir}}.

  {bold yarn start}
`);
    },
  };
};
