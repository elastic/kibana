/* jshint node:true */
'use strict';
module.exports = function (grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    kibanaCheckoutDir: './vendor/kibana',
    shipperDir: 'shipper',
    buildDir: 'build',
    packageDir: 'packages',
    tempDir: 'tmp',
    esPort: {
      dev: '"9200"',
      dist: "(window.location.port !== '' ? ':'+window.location.port : '')"
    },
    kibanaPort: 5601,
    kibanaHost: 'localhost'

  };

  // more detailed config
  config['buildMergeDir'] = config['buildDir'] + '/merge'; // kibana and custom panels will be merged here
  config['buildSiteDir'] = config['buildDir'] + '/_site';  // compressed minified marvel site will be outputted here

  // Utility function to load plugin settings into the above config object
  function loadConfig(config, path) {
    require('glob').sync('*', {cwd: path}).forEach(function (option) {
      var key = option.replace(/\.js$/, '');
      // Merge duplicate plugin configs. It is your responsibility to avoid naming collisions
      // in tasks
      config[key] = config[key] || {};
      grunt.util._.extend(config[key], require(path + option)(config, grunt));
    });
    return config;
  }

  // load plugins
  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('grunt-connect-rewrite');

  // Load Marvel tasks. Identical task names will override kibana tasks
  grunt.loadTasks('tasks');
  loadConfig(config, './tasks/options/');

  // pass the config to grunt
  grunt.initConfig(config);

};