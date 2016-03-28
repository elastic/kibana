/*jshint node:true */

module.exports = function (grunt) {
	function logOutput(line) {
		var state = 'write';

		if (/(\d+)\/(\d+) tests (pass|fail)/.test(line)) {
			var match = /(\d+)\/(\d+) tests (pass|fail)/.exec(line),
				count = Number(match[1]),
				total = Number(match[2]);
			if (match[3] === 'pass') {
				state = (count === total) ? 'ok' : 'error';
			}
			else {
				state = count ? 'error' : 'ok';
			}
		}
		else if (/\bPASS/.test(line)) {
			state = 'ok';
		}
		else if (/\bFAIL/.test(line)) {
			state = 'error';
		}

		state === 'error' && grunt.event.emit('intern.fail', line);
		state === 'ok' && grunt.event.emit('intern.pass', line);
		grunt.log[state](line);
	}

	function readOutput(data) {
		var start = 0,
			next;

		data = String(data);
		next = data.indexOf('\n', start);

		while (next !== -1) {
			logOutput(data.substring(start, next) + '\n');
			start = next + 1;
			next = data.indexOf('\n', start);
		}

		logOutput(data.slice(start));
	}

	function serialize(data) {
		if (typeof data === 'object') {
			return JSON.stringify(data);
		}

		return data;
	}

	grunt.registerMultiTask('intern', function () {
		var done = this.async(),
			opts = this.options({ runType: 'client' }),
			args = [ require('path').join(__dirname, '..') + '/' + opts.runType + '.js' ],
			env = Object.create(process.env),
			skipOptions = {
				browserstackAccessKey: true,
				browserstackUsername: true,
				runType: true,
				sauceAccessKey: true,
				sauceUsername: true,
				testingbotKey: true,
				testingbotSecret: true,
				nodeEnv: true
			};

		Object.keys(opts).forEach(function (option) {
			if (skipOptions[option]) {
				return;
			}

			var value = opts[option];

			if (Array.isArray(value)) {
				value.forEach(function (value) {
					args.push(option + '=' + serialize(value));
				});
			}
			else if (typeof value === 'boolean') {
				if (value) {
					args.push(option);
				}
			}
			else {
				args.push(option + '=' + serialize(value));
			}
		});

		[
			'browserstackAccessKey',
			'browserstackUsername',
			'sauceAccessKey',
			'sauceUsername',
			'testingbotKey',
			'testingbotSecret',
			'nodeEnv'
		].forEach(function (option) {
			var value = opts[option];
			if (value) {
				env[option.replace(/[A-Z]/g, '_$&').toUpperCase()] = value;
			}
		});

		// force colored output for istanbul report
		env.FORCE_COLOR = true;
		
		var child = grunt.util.spawn({
			cmd: process.argv[0],
			args: args,
			opts: {
				cwd: process.cwd(),
				env: env
			}
		}, function (error) {
			// The error object from grunt.util.spawn contains information
			// that we already logged, so hide it from the user
			done(error ? new Error('Test failure; check output above for details.') : null);
		});

		child.stdout.on('data', readOutput);
		child.stderr.on('data', readOutput);
	});
};
