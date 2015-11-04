module.exports = function(grunt){
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	// grunt.loadNpmTasks('grunt-karma');

	grunt.initConfig({
		uglify: {
			target: {
				files: {
					'src/angular-sortable-view.min.js': ['src/angular-sortable-view.js']
				}
			},
			options: {
				banner: '/*\n\tCopyright Kamil Pękala http://github.com/kamilkp\n' +
						'\tangular-sortable-view v0.0.13 2015/01/13\n*/\n'
			}
		},
		jshint: {
			all: [
				'src/angular-sortable-view.js',
				'Gruntfile.js'
			]
		}//,
		// karma: {
		// 	unit: {
		// 		configFile: 'karma.conf.js',
		// 		singleRun: true,
		// 	},
		// 	travis: {
		// 		configFile: 'karma.conf.js',
		// 		singleRun: true,
		// 		browsers: [
		// 			'Firefox'
		// 		]
		// 	}
		// }
	});

	grunt.registerTask('min', 'Minify javascript source code', 'uglify');
	// grunt.registerTask('test', 'Run unit tests', ['jshint', 'min', 'karma:unit']);
	// grunt.registerTask('default', ['test']);
	// grunt.registerTask('travis', ['jshint', 'min', 'karma:travis']);
};