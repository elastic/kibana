/*
 * grunt-esvm
 * https://github.com/spenceralger/grunt-esvm
 *
 * Copyright (c) 2014 Spencer Alger
 * Licensed under the Apache, 2.0 licenses.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  var config = {
    pkg: require('./package.json')
  };

  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/grunt/config',
    init: true,
    config: config
  });

  grunt.loadTasks('tasks');
  grunt.loadTasks('grunt/tasks');
};
