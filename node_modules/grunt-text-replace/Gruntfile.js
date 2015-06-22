module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    replace: {
      example: {
        src: ['test/text_files/example.txt'],
        dest: 'test/modified/',
        replacements: [{
          from: 'Hello',
          to: 'Good bye'
        }, {
          from: /(f|F)(o{2,100})/g,
          to: 'M$2'
        }, {
          from: /"localhost"/,
          to: function (matchedWord, index, fullText, regexMatches) {
            return '"www.mysite.com"';
          }
        }, {
          from: '<p>Version:</p>',
          to: '<p>Version: <%= grunt.template.date("18 Feb 2013", "yyyy-mm-dd") %></p>'
        }, {
          from: /[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}/g,
          to: function() {
            return "<%= grunt.template.date('18 Feb 2013', 'dd/mm/yyyy') %>";
          }
        }]
      },

      overwrite: {
        src: ['test/modified/example.txt'],
        overwrite: true,
        replacements: [{
          from: 'World',
          to: 'PLANET'
        }]
      },

      disable_template_processing: {
        src: ['test/text_files/template-example.txt'],
        dest: 'test/modified/',
        options: {
          processTemplates: false
        },
        replacements: [{
          from: /url\(.*\)/g,
          to: function () {
            return "url(<% some unprocessed text %>)";
          }
        }]
      }

    },

    nodeunit: {
      errors: ['test/text-replace-error-tests.js'],
      tests: ['test/text-replace-unit-tests.js'],
      replace: ['test/text-replace-functional-tests.js'],
    },

  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  grunt.registerTask('default', ['jshint', 'test']);

/*
    A note on testing (ie. running: grunt test):

    There are two kinds of tests:

    - Tests that don't result in a warning
    - Test that do result in a warning (grunt.warn())

    I haven't been able to find a convenient way of testing for grunt.warn()
    events without enabling '--force' when running grunt. For this reason I've
    set up the 'test' task to just run the main tests, and only if --force is on
    to run the error-throwing tests.

*/

  grunt.registerTask('test', function () {
    var isForceOn = grunt.option('force') || false;
    var taskList = ['nodeunit:tests'];
    if (isForceOn) {
      taskList.push('nodeunit:errors');
    }
    taskList.push('replace');
    taskList.push('nodeunit:replace');
    grunt.task.run(taskList);
  });
};
