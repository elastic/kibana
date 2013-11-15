/* jshint node:true */
'use strict';
module.exports = function (grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    baseDir:    './kibana',
    srcDir:     'kibana/src',
    buildDir:   'build',
    packageDir: 'packages',
    destDir:    'build/_site',
    tempDir:    'tmp',
    port: {
      dev  : '"9200"',
      dist : "(window.location.port !== '' ? ':'+window.location.port : '')"
    }
  };

  // Utility function to load plugin settings into the above config object
  function loadConfig(config,path) {
    require('glob').sync('*', {cwd: path}).forEach(function(option) {
      var key = option.replace(/\.js$/,'');
      // Merge duplicate plugin configs. It is your responsibility to avoid naming collisions
      // in tasks
      config[key] = config[key] || {};
      grunt.util._.extend(config[key], require(path + option)(config,grunt));
    });
    return config;
  }

  // load plugins
  require('load-grunt-tasks')(grunt);

  // Load Kibana tasks if they exist. Should probably want the user if they don't.
  if (grunt.file.exists(config.baseDir)) {
    grunt.loadTasks(config.baseDir+'/tasks');
    loadConfig(config,config.baseDir+'/tasks/options/');
    grunt.task.renameTask('build', 'build-kibana');
  }

  // Load Marvel tasks. Identical task names will override kibana tasks
  grunt.loadTasks('tasks');
  loadConfig(config,'./tasks/options/');

  // pass the config to grunt
  grunt.initConfig(config);

};