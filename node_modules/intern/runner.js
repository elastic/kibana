/* jshint node:true */
if (typeof process !== 'undefined' && typeof define === 'undefined') {
	(function () {
		require('dojo/loader')((this.__internConfig = {
			baseUrl: process.cwd().replace(/\\/g, '/'),
			packages: [
				{ name: 'intern', location: __dirname.replace(/\\/g, '/') }
			],
			map: {
				intern: {
					dojo: 'intern/node_modules/dojo',
					chai: 'intern/node_modules/chai/chai',
					diff: 'intern/node_modules/diff/diff'
				},
				'*': {
					'intern/dojo': 'intern/node_modules/dojo'
				}
			}
		}), [ 'intern/runner' ]);
	})();
}
else {
	define([
		'./lib/executors/PreExecutor',
		'./lib/exitHandler'
	], function (PreExecutor, exitHandler) {
		var executor = new PreExecutor({
			defaultLoaderOptions: (function () {
				return this;
			})().__internConfig,
			executorId: 'runner'
		});

		exitHandler(process, executor.run(), 10000);
	});
}
