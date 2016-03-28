define([], function () {
	return function (process, task, timeout) {
		var cancelled = false;

		process.on('SIGINT', (function () {
			var hurry = false;
			return function () {
				cancelled = true;

				if (hurry) {
					console.warn('\nShutting down immediately. You monster');
					process.exit(1);
				}

				hurry = true;
				var reason = new Error('SIGINT received');
				reason.name = 'CancelError';
				console.warn('\nShutting down gracefully; please wait or hit CTRL+C again to quit immediately');
				task.cancel(reason);
			};
		})());

		task.then(function (numFailedTests) {
			process.once('exit', function () {
				process.exit(cancelled || numFailedTests ? 1 : 0);
			});
		},
		function () {
			process.once('exit', function () {
				process.exit(2);
			});
		})
		.finally(function () {
			var ref = setTimeout(function () {
				console.warn('Node.js hang detected; make sure to close all sockets, timers, and ' +
					'servers you opened during testing!');
				process.exit();
			}, timeout);
			ref.unref();
		});
	};
});
