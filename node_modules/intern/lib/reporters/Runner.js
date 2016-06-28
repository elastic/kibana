define([
	'dojo/node!charm',
	'dojo/node!util',
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/text-summary',
	'dojo/node!istanbul/lib/report/text',
	'../../main',
	'../util'
], function (charm, nodeUtil, Collector, Reporter, DetailedReporter, intern, util) {
	var LIGHT_RED = '\x1b[91m';
	var LIGHT_GREEN = '\x1b[92m';
	var LIGHT_YELLOW = '\x1b[93m';
	var LIGHT_MAGENTA = '\x1b[95m';

	function Runner(config) {
		config = config || {};

		this.sessions = {};
		this.hasErrors = false;
		this.proxyOnly = Boolean(config.internConfig.proxyOnly);
		this.reporter = new Reporter({
			watermarks: config.watermarks
		});
		this.detailedReporter = new DetailedReporter({
			watermarks: config.watermarks
		});

		this.charm = charm();
		this.charm.pipe(config.output);
		this.charm.display('reset');
	}

	Runner.prototype = {
		coverage: function (sessionId, coverage) {
			// coverage will be called for the runner host, which has no session ID -- ignore that
			if (intern.mode === 'client' || sessionId) {
				var session = this.sessions[sessionId || ''];
				session.coverage = session.coverage || new Collector();
				session.coverage.add(coverage);
			}
		},

		deprecated: function (name, replacement, extra) {
			this.charm
				.write(LIGHT_YELLOW)
				.write('⚠︎ ' + name + ' is deprecated. ');

			if (replacement) {
				this.charm.write('Use ' + replacement + ' instead.');
			}
			else {
				this.charm.write('Please open a ticket at https://github.com/theintern/intern/issues if you still ' +
					'require access to this function.');
			}

			if (extra) {
				this.charm.write(' ' + extra);
			}

			this.charm.write('\n').display('reset');
		},

		fatalError: function (error) {
			this.charm
				.background('red')
				.write('(ノಠ益ಠ)ノ彡┻━┻\n')
				.write(util.getErrorMessage(error))
				.display('reset')
				.write('\n');

			this.hasErrors = true;
		},

		proxyStart: function (proxy) {
			this.charm.write('Listening on 0.0.0.0:' + proxy.config.port + '\n');
		},

		reporterError: function (reporter, error) {
			this.charm
				.background('red')
				.write('Reporter error!\n')
				.write(util.getErrorMessage(error))
				.display('reset')
				.write('\n');
		},

		runEnd: function () {
			var collector = new Collector();
			var numEnvironments = 0;
			var numTests = 0;
			var numFailedTests = 0;
			var numSkippedTests = 0;

			for (var sessionId in this.sessions) {
				var session = this.sessions[sessionId];
				session.coverage && collector.add(session.coverage.getFinalCoverage());
				++numEnvironments;
				numTests += session.suite.numTests;
				numFailedTests += session.suite.numFailedTests;
				numSkippedTests += session.suite.numSkippedTests;
			}

			// add a newline between test results and coverage results for prettier output
			this.charm.write('\n');

			if (collector.files().length > 0) {
				this.detailedReporter.writeReport(collector);
			}

			var message = 'TOTAL: tested %d platforms, %d/%d tests failed';

			if (numSkippedTests) {
				message += ' (' + numSkippedTests + ' skipped)';
			}

			if (this.hasErrors && !numFailedTests) {
				message += '; fatal error occurred';
			}

			this.charm
				.display('bright')
				.background(numFailedTests > 0 || this.hasErrors ? 'red' : 'green')
				.write(nodeUtil.format(message, numEnvironments, numFailedTests, numTests))
				.display('reset')
				.write('\n');
		},

		suiteEnd: function (suite) {
			if (!suite.hasParent) {
				// runEnd will report all of this information, so do not repeat it
				if (intern.mode === 'client') {
					return;
				}

				// Runner mode test with no sessionId was some failed test, not a bug
				if (!suite.sessionId) {
					return;
				}

				if (!this.sessions[suite.sessionId]) {
					if (!this.proxyOnly) {
						this.charm
							.write(LIGHT_YELLOW)
							.write('BUG: suiteEnd was received for invalid session ' + suite.sessionId)
							.display('reset')
							.write('\n');
					}

					return;
				}

				var session = this.sessions[suite.sessionId];

				if (session.coverage) {
					this.reporter.writeReport(session.coverage);
				}
				else {
					this.charm
						.write('No unit test coverage for ' + suite.name)
						.display('reset')
						.write('\n');
				}

				var name = suite.name;
				var numFailedTests = suite.numFailedTests;
				var numTests = suite.numTests;
				var numSkippedTests = suite.numSkippedTests;

				var summary = nodeUtil.format('%s: %d/%d tests failed', name, numFailedTests, numTests);
				if (numSkippedTests) {
					summary += ' (' + numSkippedTests + ' skipped)';
				}

				this.charm
					.write(numFailedTests > 0 ? LIGHT_RED : LIGHT_GREEN)
					.write(summary)
					.display('reset')
					.write('\n\n');
			}
		},

		suiteError: function (suite) {
			var error = suite.error;

			this.charm
				.background('red')
				.write('Suite ' + suite.id + ' FAILED\n')
				.write(util.getErrorMessage(error))
				.display('reset')
				.write('\n');

			this.hasErrors = true;
		},

		suiteStart: function (suite) {
			if (!suite.hasParent) {
				this.sessions[suite.sessionId || ''] = { suite: suite };
				if (suite.sessionId) {
					this.charm.write('‣ Created session ' + suite.name + ' (' + suite.sessionId + ')\n');
				}
			}
		},

		testFail: function (test) {
			this.charm
				.write(LIGHT_RED)
				.write('× ' + test.id)
				.foreground('white')
				.write(' (' + (test.timeElapsed / 1000) + 's)')
				.write('\n')
				.foreground('red')
				.write(util.getErrorMessage(test.error))
				.display('reset')
				.write('\n');
		},

		testPass: function (test) {
			this.charm
				.write(LIGHT_GREEN)
				.write('✓ ' + test.id)
				.foreground('white')
				.write(' (' + (test.timeElapsed / 1000) + 's)')
				.display('reset')
				.write('\n');
		},

		testSkip: function (test) {
			this.charm
				.write(LIGHT_MAGENTA)
				.write('~ ' + test.id)
				.foreground('white')
				.write(' (' + (test.skipped || 'skipped') + ')')
				.display('reset')
				.write('\n');
		},

		tunnelDownloadProgress: function (tunnel, progress) {
			this.charm.write('Tunnel download: ' + (progress.loaded / progress.total * 100).toFixed(3) + '%\r');
		},

		tunnelStart: function () {
			this.charm.write('Tunnel started\n');
		},

		tunnelStatus: function (tunnel, status) {
			this.charm.write(status + '\r');
		}
	};

	return Runner;
});
