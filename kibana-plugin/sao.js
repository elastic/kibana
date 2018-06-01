const _ = require('lodash');
const pkg = require('./package.json');

module.exports = {
  templateOptions: {
    context: {
      kebabCase: _.kebabCase,
      startCase: _.startCase,
      camelCase: _.camelCase,
      templateVersion: pkg.version,
    }
  },
  prompts: {
    name: {
      message: 'Name of your plugin?',
      default: ':folderName:',
    },
    description: {
      message: 'Provide a short description',
      default: 'An awesome Kibana plugin',
    },
    kbnVersion: {
      message: 'What Kibana version are you targeting?',
      default: 'master',
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
      message: 'Should an hack component be generated?',
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
    'gitignore': '.gitignore',
    'eslintrc': '.eslintrc',
  },
  installDependencies: true,
  gitInit: true,
  post({ log }) {
    log.success('Your plugin has been created, use `npm start` to run it');
  },
};
