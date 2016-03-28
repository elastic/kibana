define([
	'intern!object',
	'intern/chai!assert',
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/lcovonly',
	'dojo/node!fs',
	'./support/mocks',
	'../../../../lib/reporters/Lcov'
], function (registerSuite, assert, Collector, Reporter, fs, mock, Lcov) {
	var sessionId = 'foo';

	registerSuite({
		name: 'intern/lib/reporters/lcov',

		coverage: function () {
			var lcov = new Lcov();
			var collectorCalled = false;
			lcov._collector.add = function (coverage) {
				collectorCalled = true;
				assert.deepEqual(
					coverage,
					mock.coverage,
					'Collector#add should be called with the correct mockCoverage object'
				);
			};

			lcov.coverage(sessionId, mock.coverage);
			assert.isTrue(
				collectorCalled,
				'Collector#add should be called when the reporter coverage method is called'
			);
		},

		runEnd: function () {
			var lcov = new Lcov();

			var writeReportCalled = false;
			lcov._reporter.writeReport = function (collector) {
				writeReportCalled = true;
				assert.instanceOf(collector, Collector, 'Reporter#writeReport should be called with a Collector');
			};

			lcov.runEnd();
			assert.isTrue(
				writeReportCalled,
				'Reporter#writeReport should be called when the /runner/end method is called'
			);
		},

		'File output': function () {
			var lcov = new Lcov();

			try {
				lcov.coverage(sessionId, mock.coverage);
				lcov.runEnd();
				assert.isTrue(fs.existsSync('lcov.info'), 'lcov.info file was written to disk');
				assert(fs.statSync('lcov.info').size > 0, 'lcov.info contains data');
			}
			finally {
				fs.existsSync('lcov.info') && fs.unlinkSync('lcov.info');
			}
		}
	});
});
