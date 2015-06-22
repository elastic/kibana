'use strict';

var path = require('path');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options : {
        jshintrc : '.jshintrc'
      },
      all: ['Gruntfile.js', 'tasks/**/*.js', 'test/**/*.js']
    },
    open : {
      dev : {
        path : 'http://mozilla.com/',
        app : 'firefox'
      },
      google : {
        url : 'http://google.com/',
        app : 'Google Chrome'
      },
      default_app : {
        url : 'http://example.com/',
        options : {
          delay : 100
        }
      },
      file : {
        file : '/etc/hosts'
      },
      onOpen: {
        file: './LICENSE',
        options: {
          openOn: 'openOnTrigger'
        }
      },
      neverTrigger: {
        file: path.join(__dirname, '.jshintrc'),
        options: {
          openOn: 'nevertriggered'
        }
      }
    }
  });

  grunt.registerTask('mockOnTrigger', function () {
    var done = this.async();
    setTimeout(function () {
      grunt.event.emit('openOnTrigger');
      done();
    }, 100);
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Load local tasks.
  grunt.loadTasks('tasks');

  // Default task.
  grunt.registerTask('default', ['jshint', 'test']);

  // test
  grunt.registerTask('test', ['open', 'mockOnTrigger']);
};
