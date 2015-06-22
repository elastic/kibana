/*
 * grunt-contrib-jshint
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      allFiles: [
        'Gruntfile.js',
        'tasks/**/*.js',
        '<%= nodeunit.tests %>',
      ],
      individualFiles: {
        files: [
          {src: 'Gruntfile.js'},
          {src: 'tasks/**/*.js'},
          {src: '<%= nodeunit.tests %>'},
        ],
      },
      withReporterShouldFail: {
        options: {
          reporter: 'checkstyle',
          reporterOutput: 'tmp/report.xml',
          force: true,
        },
        src: ['test/fixtures/missingsemicolon.js'],
      },
      ignoresSupport: {
        src: ['test/fixtures/dontlint.txt'],
      },
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-internal');

  // Whenever the "test" task is run, run the "nodeunit" task.
  grunt.registerTask('test', ['jshint', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test', 'build-contrib']);

};
