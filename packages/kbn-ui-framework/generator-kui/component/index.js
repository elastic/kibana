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

const chalk = require('chalk');
const { resolve } = require('path');
const Generator = require('yeoman-generator');
const utils = require('../utils');

module.exports = class extends Generator {
  constructor(args, options) {
    super(args, options);

    this.fileType = options.fileType;
  }

  prompting() {
    return this.prompt([
      {
        message: "What's the name of this component? Use snake_case, please.",
        name: 'name',
        type: 'input',
      },
      {
        message: `Where do you want to create this component's files?`,
        type: 'input',
        name: 'path',
        default: resolve(__dirname, '../../src/components'),
        store: true,
      },
      {
        message: 'Does it need its own directory?',
        name: 'shouldMakeDirectory',
        type: 'confirm',
        default: true,
      },
    ]).then((answers) => {
      this.config = answers;

      if (!answers.name || !answers.name.trim()) {
        this.log.error('Sorry, please run this generator again and provide a component name.');
        process.exit(1);
      }
    });
  }

  writing() {
    const config = this.config;

    const writeComponent = (isStatelessFunction) => {
      const componentName = utils.makeComponentName(config.name);
      const cssClassName = utils.lowerCaseFirstLetter(componentName);
      const fileName = config.name;

      const path = utils.addDirectoryToPath(config.path, fileName, config.shouldMakeDirectory);

      const vars = (config.vars = {
        componentName,
        cssClassName,
        fileName,
      });

      const componentPath = (config.componentPath = `${path}/${fileName}.js`);
      const testPath = (config.testPath = `${path}/${fileName}.test.js`);
      const stylesPath = (config.stylesPath = `${path}/_${fileName}.scss`);
      config.stylesImportPath = `./_${fileName}.scss`;

      // If it needs its own directory then it will need a root index file too.
      if (this.config.shouldMakeDirectory) {
        this.fs.copyTpl(
          this.templatePath('_index.scss'),
          this.destinationPath(`${path}/_index.scss`),
          vars
        );

        this.fs.copyTpl(
          this.templatePath('index.js'),
          this.destinationPath(`${path}/index.js`),
          vars
        );
      }

      // Create component file.
      this.fs.copyTpl(
        isStatelessFunction
          ? this.templatePath('stateless_function.js')
          : this.templatePath('component.js'),
        this.destinationPath(componentPath),
        vars
      );

      // Create component test file.
      this.fs.copyTpl(this.templatePath('test.js'), this.destinationPath(testPath), vars);

      // Create component styles file.
      this.fs.copyTpl(this.templatePath('_component.scss'), this.destinationPath(stylesPath), vars);
    };

    switch (this.fileType) {
      case 'component':
        writeComponent();
        break;

      case 'function':
        writeComponent(true);
        break;
    }
  }

  end() {
    const showImportComponentSnippet = () => {
      const componentName = this.config.vars.componentName;

      this.log(chalk.white(`\n// Export component (e.. from component's index.js).`));
      this.log(
        `${chalk.magenta('export')} {\n` +
          `  ${componentName},\n` +
          `} ${chalk.magenta('from')} ${chalk.cyan(`'./${this.config.name}'`)};`
      );

      this.log(chalk.white('\n// Import styles.'));
      this.log(`${chalk.magenta('@import')} ${chalk.cyan(`'${this.config.name}'`)};`);

      this.log(chalk.white('\n// Import component styles into the root index.scss.'));
      this.log(`${chalk.magenta('@import')} ${chalk.cyan(`'${this.config.name}/index'`)};`);
    };

    this.log('------------------------------------------------');
    this.log(chalk.bold('Handy snippets:'));
    switch (this.fileType) {
      case 'component':
        showImportComponentSnippet();
        break;

      case 'function':
        showImportComponentSnippet();
        break;
    }
    this.log('------------------------------------------------');
  }
};
