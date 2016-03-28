define([], function () {
	function parseArguments(rawArgs, decode) {
		var args = {};
		rawArgs.forEach(function (arg) {
			arg = arg.split('=');

			var key = arg[0].replace(/^--?/, '');
			var value;

			// Support boolean flags
			if (arg.length < 2) {
				value = true;
			}
			else {
				value = decode(arg[1]);

				// Support JSON-encoded properties for reporter configuration
				if (value.charAt(0) === '{') {
					value = JSON.parse(value);
				}
				else if (value.slice(0, 2) === '\\{') {
					value = value.slice(1);
				}
			}

			// Support multiple arguments with the same name
			if (key in args) {
				if (!Array.isArray(args[key])) {
					args[key] = [ args[key] ];
				}

				args[key].push(value);
			}
			else {
				args[key] = value;
			}
		});

		return args;
	}

	return {
		fromCommandLine: function (rawArgs) {
			/* globals process */
			return parseArguments(rawArgs || process.argv.slice(2), function (string) {
				return string;
			});
		},
		fromQueryString: function (query) {
			return parseArguments(query.replace(/^\?/, '').split('&'), function (string) {
				// Boolean properties should not be coerced into strings, but will be if they are passed to
				// decodeURIComponent
				if (typeof string === 'boolean') {
					return string;
				}

				return decodeURIComponent(string);
			});
		}
	};
});
