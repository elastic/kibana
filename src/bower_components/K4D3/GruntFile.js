module.exports = function(grunt) {

    //Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            compile: {
                options: {
                    baseUrl: '.',
                    name: 'lib/almond/almond',
                    include: ['src/index'],
                    optimize: 'none',
                    out: 'build/k4.d3.js',
                    onBuildRead: function(moduleName, path, contents) {
                        return contents.replace(/console.log(.*);/g, '');
                    },
                    wrap: {
                        startFile: 'src/start.js',
                        endFile: 'src/end.js'
                    }
                }
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        },
        concat: {
            options: {
              separator: ''
            },
            dist: {
                src: [],
                dest: ''
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            js: {
                files: {
                    'build/k4.d3.min.js': ['build/k4.d3.js']
                }
            }
        },
        jshint: {
            foo: {
                src: 'src/**/*.js'
            },
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            js: {
                files: ['src/**/*.js'],
                tasks: ['requirejs']
            }
        },
        copy: {
            css: {
                files: [
                    { src: 'src/css/k4.d3.css', dest: 'k4.d3.css' }
                ]
            }
        },
        cssmin: {
            dist: {
                files: {
                    'k4.d3.min.css' : ['k4.d3.css']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', ['requirejs', 'copy', 'watch']);
    grunt.registerTask('production', ['requirejs', 'uglify', 'copy', 'cssmin']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('unit-test', ['karma']);
};