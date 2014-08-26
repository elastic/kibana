module.exports = function(grunt) {
    "use strict";
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: [
                    "src/begin.js",
                    "src/objects/axis/begin.js",
                    "src/objects/axis/methods/*.js",
                    "src/objects/axis/end.js",
                    "src/objects/chart/begin.js",
                    "src/objects/chart/methods/*.js",
                    "src/objects/chart/end.js",
                    "src/objects/color/begin.js",
                    "src/objects/color/end.js",
                    "src/objects/eventArgs/begin.js",
                    "src/objects/eventArgs/end.js",
                    "src/objects/legend/begin.js",
                    "src/objects/legend/methods/*.js",
                    "src/objects/legend/end.js",
                    "src/objects/series/begin.js",
                    "src/objects/series/methods/*.js",
                    "src/objects/series/end.js",
                    "src/objects/storyboard/begin.js",
                    "src/objects/storyboard/methods/*.js",
                    "src/objects/storyboard/end.js",
                    "src/objects/aggregateMethod/*.js",
                    "src/objects/plot/*.js",
                    "src/methods/*.js",
                    "src/end.js"
                ],
                dest: 'dist/<%= pkg.name %>.v<%= pkg.version %>.js'
            },
            test: {
                src: '<%= concat.dist.src %>',
                dest: 'tmp/<%= pkg.name %>.js'
            }
        },
        uglify: {
            dist: {
                files: {
                    'dist/<%= pkg.name %>.v<%= pkg.version %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 3001,
                    base: '.'
                }
            }
        },
        jslint: {
            files: [
                'Gruntfile.js',
                'test/**/*.spec.js',
                'dist/<%= pkg.name %>.v<%= pkg.version %>.js'
            ],
            directives: {
                browser: true,
                nomen: true,
                plusplus: true,
                predef: [
                    'd3',
                    'module',
                    'console',
                    'jasmine',
                    'dimple',
                    'module',
                    'define',
                    'require',
                    'exports',
                    'describe',
                    'it',
                    'xdescribe',
                    'xit',
                    'beforeEach',
                    'afterEach'
                ]
            }
        },
        prop: {
            dist: {
                src: [
                    'examples/templates/*.html'
                ]
            },
            options: {
                exampleOutputPath: 'examples/',
                libPath: '/lib/',
                distPath: '/dist/',
                version: 'v<%= pkg.version %>',
                d3version: 'v<%= pkg.buildDependencies.d3 %>',
                scriptTag: '{scriptDependencies}',
                header: "<!----------------------------------------------------------------->\n" +
                        "<!-- AUTOMATICALLY GENERATED CODE - PLEASE EDIT TEMPLATE INSTEAD -->\n" +
                        "<!----------------------------------------------------------------->\n"
            }
        },
        karma: {
            options: {
                basepath: '',
                frameworks: ['jasmine', 'requirejs'],
                files: [
                    'test/test-main.js',
                    { pattern: 'lib/*.min.js', included: false },
                    { pattern: 'tmp/*.js', included: false },
                    { pattern: 'test/**/*.spec.js', included: false }
                ],
                reporters: ['progress'],
                port: 9876,
                colors: true,
                browsers: ['PhantomJS']
            },
            unit: {
                singleRun: true
            },
            continuous: {
                background: true
            }
        },
        watch: {
            src: {
                files: [
                    '<%= concat.test.src %>'
                ],
                tasks: ['concat:test', 'karma:continuous:run']
            },
            test: {
                files: [
                    'test/**/*.spec.js',
                    'test/*.spec.js'
                ],
                tasks: ['karma:continuous:run']
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

    // Propogate version into relevant files
    grunt.registerMultiTask('prop', 'Propagate Versions.', function () {
        function generateScriptElements(options, indent) {
            var d3Path = "{libFolder}d3.{d3version}.js",
                dimplePath = "{distFolder}dimple.{version}.js",
                createScriptElement = function (path) {
                    var scriptElement = '<script src="{path}"></script>';
                    return scriptElement.split("{path}").join(path);
                },
                libPath = options.libPath,
                distPath = options.distPath,
                version = options.version,
                d3version = options.d3version,
                tab = "",
                i;

            // default indentation to two spaces
            indent = indent || 2;

            for (i = 0; i < indent; i++) {
                tab += " ";
            }

            d3Path = d3Path.split("{libFolder}").join(libPath);
            d3Path = d3Path.split("{d3version}").join(d3version);
            dimplePath = dimplePath.split("{distFolder}").join(distPath);
            dimplePath = dimplePath.split("{version}").join(version);

            grunt.log.writeln("\nUsing d3: " + d3Path + " with " + d3version);
            grunt.log.writeln("\nUsing dimple: " + dimplePath + " with " + version + "\n");

            return createScriptElement(d3Path) + "\n" + tab + createScriptElement(dimplePath);
        }

        var options = this.options(),
            outPath = options.exampleOutputPath,
            header = options.header,
            scriptTag = options.scriptTag,
            scripts = generateScriptElements(options);

        this.files.forEach(function (f) {
            f.src.filter(function (filepath) {
                var result = true;
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('File "' + filepath + '" not found.');
                    result = false;
                }
                return result;
            }).map(function (filepath) {
                // Read file source.
                var src = grunt.file.read(filepath);

                // Replace the script placeholder tag with script html elements
                src = src.split(scriptTag).join(scripts);

                // Write the new file
                grunt.log.writeln("Creating " + outPath + filepath.substring(filepath.lastIndexOf("/") + 1));
                grunt.file.write(outPath + filepath.substring(filepath.lastIndexOf("/") + 1), header + src);
            });
        });
    });

    // Default tasks
    grunt.registerTask('default', ['concat', 'jslint', 'uglify', 'connect', 'prop']);
    grunt.registerTask('test:unit', ['concat:test', 'karma:unit']);
    grunt.registerTask('test', ['karma:continuous:start', 'watch']);

};