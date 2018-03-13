const Generator = require('yeoman-generator');

const documentationGenerator = require.resolve('../documentation/index.js');

module.exports = class extends Generator {
  prompting() {
    return this.prompt([{
      message: 'What do you want to create?',
      name: 'fileType',
      type: 'list',
      choices: [{
        name: 'Page',
        value: 'documentation',
      }, {
        name: 'Page demo',
        value: 'demo',
      }, {
        name: 'Sandbox',
        value: 'sandbox',
      }],
    }]).then(answers => {
      this.config = answers;
    });
  }

  writing() {
    this.composeWith(documentationGenerator, {
      fileType: this.config.fileType,
    });
  }
};
