'use strict';

module.exports = function (options, excludes) {
	var args = [];

	Object.keys(options).forEach(function (key) {
		var flag;
		var val = options[key];

		if (Array.isArray(excludes) && excludes.indexOf(key) !== -1) {
			return;
		}

		flag = key.replace(/[A-Z]/g, '-$&').toLowerCase();

		if (val === true) {
			args.push('--' + flag);
		}

		if (typeof val === 'string') {
			args.push('--' + flag, val);
		}

		if (typeof val === 'number' && isNaN(val) === false) {
			args.push('--' + flag, '' + val);
		}

		if (Array.isArray(val)) {
			val.forEach(function (arrVal) {
				args.push('--' + flag, arrVal);
			});
		}
	});

	return args;
};
