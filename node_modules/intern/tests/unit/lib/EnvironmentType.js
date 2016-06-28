define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/EnvironmentType'
], function (registerSuite, assert, EnvironmentType) {
	registerSuite({
		name: 'intern/lib/EnvironmentType',

		'constructor with info': function () {
			var type = new EnvironmentType({
				browserName: 'Browser',
				version: '1.0',
				platform: 'Platform',
				platformVersion: '2.0'
			});

			assert.strictEqual(type.toString(), 'Browser 1.0 on Platform 2.0');
		},

		'constructor missing info': function () {
			var type = new EnvironmentType({});
			assert.strictEqual(type.toString(), 'Any browser on any platform');
		}
	});
});
