(function () {

    module.exports = function (grunt) {

        // Load grunt tasks automatically
        require('load-grunt-tasks')(grunt);

        // Time how long tasks take. Can help when optimizing build times
        require('time-grunt')(grunt);

        // Define the configuration for all the tasks
        grunt.initConfig({
            express: {
                options: {
                    livereload: true,
                },
                dev: {
                  options: {
                    script: 'server/index.js'
                  }
                }
            },

            // Project settings
            yeoman: {
                // configurable paths
                app: require('./bower.json').appPath || 'app',
                dist: 'dist'
            },

            open: {
              all: {
                // Gets the port from the connect configuration
                path: 'http://localhost:3000'
              }
            },

            // Watches files for changes and runs tasks based on the changed files
            watch: {
                express: {
                    files:  [ 'server/**/*.js' ],
                    tasks:  [ 'express:dev' ],
                    options: {
                      spawn: false
                    }
                }
            },

            // Automatically inject Bower components into the app
            'bower': {
                install: {
                    html: '<%= yeoman.app %>/index.html',
                    targetDir: 'app/bower_components'
                }
            },

            // Test settings
            karma: {
                unit: {
                    configFile: 'karma.conf.js',
                    singleRun: true
                }
            },

            replace: {
                test: {
                    src: '<%= yeoman.app %>/../test/test-main.js',
                    overwrite: true,
                    replacements: [
                        {
                            from: /paths: {[^}]+}/,
                            to: function () {
                                return require('fs').readFileSync(grunt.template.process('<%= yeoman.app %>') + '/scripts/main.js').toString().match(/paths: {[^}]+}/);
                            }
                        }
                    ]
                }
            },

            // r.js compile config
            requirejs: {
                dist: {
                    options: {
                        baseUrl: '<%= yeoman.app %>/scripts',
                        dir: '<%= yeoman.dist %>/scripts',
                        preserveLicenseComments: false,
                        removeCombined: true,
                        useStrict: true,
                        wrap: false,
                        fileExclusionRegExp: /^tests$/
                    }
                }
            }
        });

        grunt.registerTask('dev', function (target) {
            if (target === 'dist') {
                return grunt.task.run(['build', 'express:dev']);
            }

            grunt.task.run([
                'express:dev',
                'bower:install',
                'open',
                'watch'
            ]);
        });
    };
}());
