'use strict';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-conventional-changelog');



  var plugins = ['karma-mocha'];
  var browsers = [];

  if (process.env.TRAVIS) {
    plugins.push('karma-firefox-launcher');
    browsers.push('Firefox');
  } else {
    plugins.push('karma-chrome-launcher');
    browsers.push('Chrome');
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    karma: {
      // all of the targets will use/override these options
      options: {
        browsers: browsers,
        files: [
          'node_modules/expect.js/expect.js',
          'test/**/*.js'
        ],
        frameworks: ['mocha'],
        plugins: plugins,
      },
      single: {
        singleRun: true
      },
      // watch using grunt-watch
      dev: {
        reporters: 'dots',
        background: true
      },
      // watch using karma
      auto: {
        autoWatch: true
      }
    },

    changelog: {
      options: {
        dest: 'CHANGELOG.md'
      }
    },

    watch: {
      tests: {
        files: 'test/**/*.js',
        tasks: ['karma:dev:run']
      }
    },

    release: {
      options: {
        npmtag: true
      }
    }

  });

  //Load karma plugin
  grunt.loadTasks('tasks');

  grunt.registerTask('test', ['karma:single']);
  grunt.registerTask('default', ['test']);
};
