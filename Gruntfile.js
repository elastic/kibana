const camelCase = require('lodash').camelCase;
require('babel/register')(require('./src/optimize/babel_options').node);

module.exports = function (grunt) {
  // set the config once before calling load-grunt-config
  // and once during so that we have access to it via
  // grunt.config.get() within the config files
  const config = {
    pkg: grunt.file.readJSON('package.json'),
    root: __dirname,
    src: __dirname + '/src',
    buildDir: __dirname + '/build', // temporary build directory
    plugins: __dirname + '/src/core_plugins',
    server: __dirname + '/src/server',
    target: __dirname + '/target', // location of the compressed build targets
    testUtilsDir: __dirname + '/src/test_utils',
    configFile: __dirname + '/src/config/kibana.yml',

    karmaBrowser: (function () {
      if (grunt.option('browser')) {
        return grunt.option('browser');
      }

      switch (require('os').platform()) {
        case 'win32':
          return 'IE';
        default:
          return 'Chrome';
      }
    }()),

    nodeVersion: grunt.file.read('.node-version').trim(),

    meta: {
      banner: '/*! <%= package.name %> - v<%= package.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= package.homepage ? " * " + package.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= package.author.company %>;' +
        ' Licensed <%= package.license %> */\n'
    },

    lintThese: [
      'Gruntfile.js',
      '<%= root %>/tasks/**/*.js',
      '<%= root %>/test/**/*.js',
      '<%= src %>/**/*.js',
      '!<%= src %>/ui/public/angular-bootstrap/**/*.js',
      '!<%= src %>/fixtures/**/*.js',
      '!<%= root %>/test/fixtures/scenarios/**/*.js'
    ],
    deepModules: {
      'caniuse-db': '1.0.30000265',
      'chalk': '1.1.0',
      'glob': '4.5.3',
      'har-validator': '1.8.0',
      'json5': '0.4.0',
      'loader-utils': '0.2.11',
      'micromatch': '2.2.0',
      'postcss-normalize-url': '2.1.1',
      'postcss-reduce-idents': '1.0.2',
      'postcss-unique-selectors': '1.0.0',
      'postcss-minify-selectors': '1.4.6',
      'postcss-single-charset': '0.3.0',
      'regenerator': '0.8.36',
      'readable-stream': '2.1.0'
    }
  };

  grunt.config.merge(config);

  // must run before even services/platforms
  grunt.config.set('build', require('./tasks/config/build')(grunt));

  config.packageScriptsDir = __dirname + '/tasks/build/package_scripts';
  // ensure that these run first, other configs need them
  config.services = require('./tasks/config/services')(grunt);
  config.platforms = require('./tasks/config/platforms')(grunt);

  grunt.config.merge(config);

  // load plugins
  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/config',
    init: true,
    config: config,
    loadGruntTasks: {
      pattern: ['grunt-*', '@*/grunt-*', 'gruntify-*', '@*/gruntify-*', 'intern']
    }
  });

  // load task definitions
  grunt.task.loadTasks('tasks');
  grunt.task.loadTasks('tasks/build');
  grunt.task.loadTasks('tasks/rebuild');
};
