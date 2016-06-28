define([
	'intern!object',
	'dojo/node!fs',
	'intern/chai!assert',
	'../../../../lib/EnvironmentType',
	'../../../../lib/Suite',
	'../../../../lib/Test',
	'../../../../lib/reporters/JUnit',
	'dojo/text!../../data/lib/reporters/JUnit/expected.xml'
], function (registerSuite, fs, assert, EnvironmentType, Suite, Test, JUnit, expected) {
	registerSuite({
		name: 'intern/lib/reporters/JUnit',

		'basic tests': function () {
			var reporter = new JUnit({ output: { write: write, end: write } });
			var report = '';
			function write(data) {
				report += data;
			}

			var assertionError = new Error('Expected 1 + 1 to equal 3');
			assertionError.name = 'AssertionError';

			var suite = new Suite({
				sessionId: 'foo',
				name: 'chrome 32 on Mac',
				timeElapsed: 1234,
				tests: [
					new Suite({
						name: 'suite1',
						timeElapsed: 1234,
						tests: [
							new Test({
								name: 'test1',
								hasPassed: true,
								timeElapsed: 45
							}),
							new Test({
								name: 'test2',
								hasPassed: false,
								error: new Error('Oops'),
								timeElapsed: 45
							}),
							new Test({
								name: 'test3',
								hasPassed: false,
								error: assertionError,
								timeElapsed: 45
							}),
							new Test({
								name: 'test4',
								hasPassed: false,
								skipped: 'No time for that',
								timeElapsed: 45
							}),
							new Suite({
								name: 'suite5',
								timeElapsed: 45,
								tests: [
									new Test({ name: 'test5.1', hasPassed: true, timeElapsed: 40 })
								]
							})
						]
					})
				]
			});

			reporter.runEnd({ suites: [ suite ] });

			// make sure slight changes in the stack trace does not cause the test to start failing
			report = report.replace(/(at Test\.registerSuite\.basic tests )[^<]*/g, '$1...');
			assert.strictEqual(report, expected, 'Report should match expected result');
		}
	});
});
