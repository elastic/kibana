<<<<<<< HEAD
require('babel/register')(require('./src/optimize/babelOptions'));

module.exports = function (grunt) {
  // set the config once before calling load-grunt-config
  // and once during so that we have access to it via
  // grunt.config.get() within the config files
  var config = {
    pkg: grunt.file.readJSON('package.json'),
    root: __dirname,
    src: __dirname + '/src',
    build: __dirname + '/build', // temporary build directory
    plugins: __dirname + '/src/plugins',
    server: __dirname + '/src/server',
    target: __dirname + '/target', // location of the compressed build targets
    testUtilsDir: __dirname + '/src/testUtils',
    configFile: __dirname + '/src/config/kibana.yml',

    karmaBrowser: (function () {
      if (grunt.option('browser')) {
        return grunt.option('browser');
      }

      switch (require('os').platform()) {
        case 'win32':
          return 'IE';
        case 'darwin':
          return 'Chrome';
        default:
          return 'Firefox';
      }
    }()),

    nodeVersion: '2.5.0',

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
      '<%= src %>/**/*.js',
      '!<%= src %>/fixtures/**/*.js'
    ]
  };

  grunt.config.merge(config);

  config.userScriptsDir = __dirname + '/build/userScripts';
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
      pattern: ['grunt-*', '@*/grunt-*', 'gruntify-*', '@*/gruntify-*']
    }
  });

  // load task definitions
  grunt.task.loadTasks('tasks');
  grunt.task.loadTasks('tasks/build');
};
=======
/* jshint node:true */
'use strict';
module.exports = function (grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    baseDir: '.',
    srcDir: 'src',
    destDir: 'dist',
    tempDir: 'tmp',
    docsDir: 'docs/',
    unitTests: 'test/unit/specs/**/*.js',
    unitTestDir: 'test/unit/'
  };

  // load plugins
  require('load-grunt-tasks')(grunt);

  // load task definitions
  grunt.loadTasks('tasks');

  // Utility function to load plugin settings into config
  function loadConfig(config,path) {
    require('glob').sync('*', {cwd: path}).forEach(function(option) {
      var key = option.replace(/\.js$/,'');
      // If key already exists, extend it. It is your responsibility to avoid naming collisions
      config[key] = config[key] || {};
      grunt.util._.extend(config[key], require(path + option)(config,grunt));
    });
    // technically not required
    return config;
  }

  // Merge that object with what with whatever we have here
  loadConfig(config,'./tasks/options/');

  // pass the config to grunt
  grunt.initConfig(config);

};
>>>>>>> FETCH_HEAD
