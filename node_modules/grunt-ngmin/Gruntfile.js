'use strict';
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-release');
  grunt.loadTasks('tasks');

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'lib/*.js',
        'tasks/*.js',
        'test/**/*.js'
      ]
    },

    ngmin: {
      controllers: {
        src: ['test/src/controllers/one.js'],
        dest: 'test/generated/controllers/one.js'
      },
      directives: {
        expand: true,
        cwd: 'test/src',
        src: ['directives/**/*.js'],
        dest: 'test/generated'
      }
    },

    mochacli: {
      options: {
        require: ['should'],
        bail: true
      },
      all: ['test/*.js']
    },

    clean: ['test/generated']
  });

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test', ['clean', 'ngmin', 'mochacli']);
};