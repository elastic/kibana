define([
	'intern!object',
	'intern/chai!assert',
	'../../main'
], function (registerSuite, assert, main) {
	registerSuite({
		name: 'intern/main',

		'initial state': function () {
			assert.isFunction(main.load, 'main.load should be a function');
			assert.property(main, 'executor', 'main should have an executor property');
		}
	});
});
