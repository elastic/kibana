'use strict';
var lpad = require('lpad');
var async = require('async');
var cpCache = [];

module.exports = function (grunt) {
	grunt.registerMultiTask('concurrent', 'Run grunt tasks concurrently', function () {
		var spawnOptions;
		var cb = this.async();
		var options = this.options({
			limit: Math.max(require('os').cpus().length, 2)
		});
		// Set the tasks based on the config format
		var tasks = this.data.tasks || this.data;

		// Warning if there are too many tasks to execute within the given limit
		if (options.limit < tasks.length) {
			grunt.log.oklns(
				'Warning: There are more tasks than your concurrency limit. After ' +
				'this limit is reached no further tasks will be run until the ' +
				'current tasks are completed. You can adjust the limit in the ' + 
				'concurrent task options'
			);
		}

		// Optionally log the task output
		if (options.logConcurrentOutput) {
			spawnOptions = { stdio: 'inherit' };
		}

		lpad.stdout('    ');
		async.eachLimit(tasks, options.limit, function (task, next) {
			var cp = grunt.util.spawn({
				grunt: true,
				args: [task].concat(grunt.option.flags()),
				opts: spawnOptions
			}, function (err, result, code) {
				if (err || code > 0) {
					grunt.warn(result.stderr || result.stdout);
				}
				grunt.log.writeln('\n' + result.stdout);
				next();
			});

			cpCache.push(cp);
		}, function () {
			lpad.stdout();
			cb();
		});
	});
};

// make sure all child processes are killed when grunt exits
process.on('exit', function () {
	cpCache.forEach(function (el) {
		el.kill();
	});
});
