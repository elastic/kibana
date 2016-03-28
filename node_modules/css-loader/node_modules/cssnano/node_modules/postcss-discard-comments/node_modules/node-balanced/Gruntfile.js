module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		webpack: {
			build: {
				devtool: 'source-map',
				entry: './index.js',
				output: {
					library: 'balanced',
					path: 'dist/',
					filename: 'balanced.js'
				}
			}
		},

		uglify: {
			build: {
				files: {
					'dist/balanced-min.js': ['dist/balanced.js']
				}
			}
		},

		banner: '/**\n * balanced.js v<%= pkg.version %>\n */',
		usebanner: {
			dist: {
				options: {
					position: 'top',
					banner: '<%= banner %>'
				},
				files: {
					'dist/balanced.js': ['dist/balanced.js'],
					'dist/balanced-min.js': ['dist/balanced-min.js']
				}
			}
		},

		jshint: {
			options: {
				jshintrc: true
			},
			all: ['./*.js', './test/*.js']
		},

		jasmine_node: {
			options: {
				forceExit: true,
				match: '.',
				matchall: false,
				extensions: 'js',
				specNameMatcher: 'test'
			},
			all: ['test/']
		},
		watch: {
			jasmine: {
				files: ['test/*.js'],
				tasks: ['test']
			}
		}
	});

	grunt.loadNpmTasks('grunt-webpack');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-banner');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-jasmine-node');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('build', ['jshint', 'webpack', 'uglify', 'usebanner']);
	grunt.registerTask('test', ['jshint', 'jasmine_node']);
};