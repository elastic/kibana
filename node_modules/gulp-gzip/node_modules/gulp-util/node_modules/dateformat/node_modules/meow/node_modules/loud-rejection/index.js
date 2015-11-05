'use strict';
module.exports = function () {
	process.on('unhandledRejection', function (err) {
		if (err instanceof Error) {
			console.error(err.stack);
		} else if (err) {
			console.error('Promise rejected with value:', err);
		} else {
			console.error('Promise rejected no value');
		}

		process.exit(1);
	});
};
