module.exports = function(grunt) {
  /**
   * Load tasks
   */
  grunt.loadNpmTasks('lesshat-devstack');
  grunt.loadNpmTasks('grunt-prompt');

  /**
   * Grunt config
   */
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    generator: {
      settings: {
        mixin_name: null,
        default_value: null,
        vendors: null
      }
    },

    version: {
      settings: {
        version: null
      }
    },

    prompt: {
      version: {
        options: {
          questions: [{
            config: 'version.settings.version',
            type: 'input',
            validate: function(value) {
              return (value && true);
            },
            message: 'LESS Hat next version number? Current is ' + '<%= pkg.version %>'.green + ':',
          }],
        }
      },
      generate: {
        options: {
          questions: [{
            config: 'generator.settings.mixin_name',
            type: 'input',
            message: 'What is the name of new mixin? (e.g. animationDelay)',
            filter: function(value) {
              grunt.config('generator.settings.mixin_css_name', value.replace(/([A-Z])/g, function(upperCase) {
                return '-' + upperCase.toLowerCase();
              }));
              grunt.config('generator.settings.mixin_name | firstLetter', value[0].toUpperCase() + value.slice(1));
              return value[0].toLowerCase() + value.slice(1);
            },
            validate: function(value) {
              if (/[a-z0-9]+/i.test(value)) {
                return true;
              } else {
                return 'Please fill only valid characters [a-zA-Z0-9].';
              }
            }
          }, {
            config: 'generator.settings.vendors',
            type: 'checkbox',
            message: 'For which browsers is this mixin?',
            choices: [{
              name: 'webkit'
            }, {
              name: 'moz'
            }, {
              name: 'opera'
            }, {
              name: 'ms',
            }]
          }, {
            config: 'generator.settings.default_value',
            type: 'input',
            default: 'none',
            filter: function(value) {
              return '\'' + value + '\'';
            },
            message: 'What is default value of the mixin? Optional – you can skip',
          }]
        }
      }
    }
  }); 

  /**
   * Register tasks
   */

  grunt.registerTask('version', ['prompt:version', 'iterate', 'build', 'mixins_update']);
  grunt.registerTask('dev', ['build', 'test']);
  grunt.registerTask('generate', ['prompt:generate', 'generator']);
  grunt.registerTask('contrib', ['build', 'test', 'mixins_update', 'prefix', 'documentation']);
  grunt.registerTask('default', ['version','build', 'test', 'mixins_update', 'prefix', 'documentation', 'git']);

};
