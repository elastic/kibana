module.exports = function(grunt) {

    //Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
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
                src: [
                    'src/start.js',
                    'src/core.js',
                    'src/modules/area.js',
                    'src/modules/dendrogram.js',
                    'src/modules/heatmap.js',
                    'src/modules/histogram.js',
                    'src/modules/horizon.js',
                    'src/modules/line.js',
                    'src/modules/map.js',
                    'src/modules/pie.js',
                    'src/modules/scatterplot.js',
                    'src/modules/sparkline.js',
                    'src/modules/spider.js',
                    'src/modules/sunburst.js',
                    'src/modules/sortedTable.js',
                    'src/modules/timeBars.js',
                    'src/modules/treemap.js',
                    'src/modules/table.js',
                    'src/end.js'
                ],
                dest: 'k4.d3.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            js: {
                files: {
                    'k4.d3.min.js': ['k4.d3.js']
                }
            }
        },
        jshint: {
            foo: {
                src: "src/**/*.js"
            },
            options: {
                jshintrc: '.jshintrc'
            }
        },
        watch: {
            js: {
                files: ["src/**/*.js"],
                tasks: ['concat']
            }
        },
        copy: {
            css: {
                files: [
                    { src: 'style/k4.d3.css', dest: 'k4.d3.css' }
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
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', ['concat', 'copy', 'watch']);
    grunt.registerTask('production', ['concat', 'uglify', 'copy', 'cssmin']);
    grunt.registerTask('release', ['production']);
    grunt.registerTask('lint', ['jshint']);
    grunt.registerTask('unit-test', ['karma']);
};