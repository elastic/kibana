'use strict';
var chalk = require('chalk');

module.exports = function (grunt) {
	grunt.registerMultiTask('svgmin', 'Minify SVG', function () {
		var options = this.options();
		var svgo = new (require('svgo'))(options);
		var filesize = require('filesize');

		grunt.util.async.forEach(this.files, function (el, next) {
			var svgin = grunt.file.read(el.src + '');
			svgo.optimize(svgin, function (result) {
				if (result.error) {
					grunt.warn('Error parsing svg: ' + result.error);
				} else {
					var saved = svgin.length - result.data.length;
					var percentage = saved / svgin.length * 100;
					var savedFormatted = filesize(saved, {
						round: 1,
						spacer: ''
					});

					grunt.log.writeln(chalk.green('✔ ') + el.src + chalk.gray(' (saved', savedFormatted, Math.round(percentage) + '%)'));
					grunt.file.write(el.dest, result.data);
				}
				next();
			});
		}, this.async());
	});
};
