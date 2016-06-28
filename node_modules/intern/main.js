define([
	'require'
], function (require) {
	return {
		/**
		 * The arguments Intern was started with, post-processing (e.g.,
		 * repeated arguments are converted to arrays).
		 */
		args: null,

		/**
		 * The executor for the current test run.
		 */
		executor: null,

		/**
		 * AMD plugin API interface for easy loading of test interfaces.
		 */
		load: function (id, parentRequire, callback) {
			require([ './lib/interfaces/' + id ], callback);
		},

		normalize: function (interfaceId) {
			// The loader should not attempt to normalize values passed to the
			// loader plugin as module IDs, since they are not module IDs.
			return interfaceId;
		},

		/**
		 * The planned execution mode. One of 'client', 'runner', or 'custom'.
		 */
		mode: null
	};
});
