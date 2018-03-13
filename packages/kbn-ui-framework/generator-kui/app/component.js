const Generator = require('yeoman-generator');

const componentGenerator = require.resolve('../component/index.js');

module.exports = class extends Generator {
  prompting() {
    return this.prompt([{
      message: 'What do you want to create?',
      name: 'fileType',
      type: 'list',
      choices: [{
        name: 'Stateless function',
        value: 'function',
      }, {
        name: 'Component class',
        value: 'component',
      }],
    }]).then(answers => {
      this.config = answers;
    });
  }

  writing() {
    this.composeWith(componentGenerator, {
      fileType: this.config.fileType,
    });
  }
};
