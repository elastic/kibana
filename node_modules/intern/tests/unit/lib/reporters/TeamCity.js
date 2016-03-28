define([
	'intern!object',
	'intern/chai!assert',
	'./support/MockStream',
	'../../../../lib/Suite',
	'../../../../lib/Test',
	'../../../../lib/reporters/TeamCity'
], function (registerSuite, assert, MockStream, Suite, Test, TeamCity) {
	var messagePatterns = {
		suiteStart: '^##teamcity\\[testSuiteStarted name=\'{id}\'',
		suiteEnd: '^##teamcity\\[testSuiteFinished name=\'{id}\' duration=\'\\d+\'',
		testStart: '^##teamcity\\[testStarted name=\'{id}\'',
		testSkip: '^##teamcity\\[testIgnored name=\'{id}\'',
		testEnd: '^##teamcity\\[testFinished name=\'{id}\' duration=\'\\d+\'',
		testFail: '^##teamcity\\[testFailed name=\'{id}\' message=\'{message}\''
	};

	function testSuite(suite, topic, type) {
		var output = new MockStream();
		var reporter = new TeamCity({ output: output });
		var expected = messagePatterns[topic].replace('{id}', suite.id);

		reporter[topic](suite);
		assert.ok(output.data, 'Data should be output when the reporter ' + topic + ' method is called');
		assert.match(
			output.data,
			new RegExp(expected),
			'Output data for ' + type + ' message should match expected message pattern');
	}

	function testTest(test, topic, type) {
		var output = new MockStream();
		var reporter = new TeamCity({ output: output });
		var expected = messagePatterns[topic].replace('{id}', test.id);

		if (test.error) {
			expected = expected.replace('{message}', test.error.message);
		}

		reporter[topic](test);
		assert.ok(output.data, 'Data should be output when the reporter ' + topic + ' method is called');
		assert.match(
			output.data,
			new RegExp(expected),
			'Output data for ' + type + ' should match expected message pattern');
	}

	registerSuite({
		name: 'intern/lib/reporters/TeamCity',

		suiteStart: function () {
			var suite = new Suite({ name: 'suite', parent: true });
			testSuite(suite, 'suiteStart', 'testSuiteStarted');
		},

		suiteEnd: {
			'successful suite': function () {
				var suite = new Suite({ name: 'suite', parent: true, timeElapsed: 123, tests: [ new Test({ hasPassed: true }) ] });
				testSuite(suite, 'suiteEnd', 'testSuiteFinished');
			},

			'failed suite': function () {
				var suite = new Suite({ name: 'suite', parent: true, timeElapsed: 123, tests: [ new Test({ hasPassed: false }) ] });
				testSuite(suite, 'suiteEnd', 'testSuiteFinished');
			}
		},

		testStart: function () {
			var test = new Test({
				name: 'test',
				timeElapsed: 123,
				parent: { name: 'parent', id: 'parent' },
				error: new Error('Oops')
			});
			testTest(test, 'testStart', 'testStarted');
		},

		testSkip: function () {
			var test = new Test({
				name: 'test',
				timeElapsed: 123,
				parent: { name: 'parent', id: 'parent' },
				error: new Error('Oops')
			});
			testTest(test, 'testSkip', 'testIgnored');
		},

		testEnd: function () {
			var test = new Test({
				name: 'test',
				timeElapsed: 123,
				parent: { name: 'parent', id: 'parent' },
				error: new Error('Oops')
			});
			testTest(test, 'testEnd', 'testFinished');
		},

		testFail: function () {
			var test = new Test({
				name: 'test',
				timeElapsed: 123,
				parent: { name: 'parent', id: 'parent' },
				error: new Error('Oops')
			});
			testTest(test, 'testFail', 'testFailed');
		}
	});
});
