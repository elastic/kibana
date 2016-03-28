/* jshint unused:strict */
define([
	'intern!object',
	'intern/chai!assert',
	'../../../../lib/reporters/Pretty',
	'../../../../lib/EnvironmentType',
	'../../../../lib/Suite',
	'../../../../lib/Test',
	'./support/mocks',
	'dojo/has!host-node?dojo/node!istanbul/lib/report/text'
], function (registerSuite, assert, Pretty, EnvironmentType, Suite, Test, mock, Reporter) {
	function bar(results) {
		return results.map(function (result) {
			return pretty.colorReplacement[result] || result;
		}).join('');
	}

	function fillArray(length, fill) {
		return Array.apply(null, { length: length }).map(function () {
			return fill;
		});
	}

	function createReport(results, total, type) {
		var report = new pretty._Report(type);
		results.forEach(function (value) {
			report.record(value);
		});
		if (typeof total !== 'undefined') {
			report.numTotal = total;
		}
		return report;
	}

	function createStub(callback) {
		var func = function () {
			func.args.push(arguments);
			callback && callback.apply(this, arguments);
		};
		func.args = [];
		return func;
	}

	function fluentMockCharmFunc() {
		return mockCharm;
	}

	var mockCharm = {
		write: function (str) {
			mockCharm.out += str;
		},
		erase: fluentMockCharmFunc,
		position: fluentMockCharmFunc,
		foreground: fluentMockCharmFunc,
		display: fluentMockCharmFunc,
		pipe: createStub()
	};

	var pretty;

	registerSuite(function () {
		return {
			name: 'intern/lib/reporters/Pretty',

			beforeEach: function () {
				mockCharm.out = '';
				pretty = new Pretty({
					dimensions: {
						width: 80,
						height: 24
					},
					internConfig: {}
				});
				pretty.charm = mockCharm;
			},

			_Report: function () {
				var report = createReport([ 0, 1, 2 ]);
				assert.isUndefined(report.environmenet);
				assert.deepEqual(report.numPassed, 1);
				assert.deepEqual(report.numSkipped, 1);
				assert.deepEqual(report.numFailed, 1);
				assert.lengthOf(report.results, 3);
				assert.deepEqual(report.results, [ 0, 1, 2 ]);
				assert.deepEqual(report.getCompressedResults(1), [ 2 ]);
				assert.deepEqual(report.getCompressedResults(2), [ 1, 2 ]);
				assert.deepEqual(report.getCompressedResults(3), [ 0, 1, 2 ]);
				assert.deepEqual(report.getCompressedResults(4), [ 0, 1, 2 ]);
			},

			_render: {
				empty: function () {
					pretty._render();
					assert.equal(mockCharm.out, 'Total: Pending\nPassed: 0  Failed: 0  Skipped: 0\n');
				},

				simple: function () {
					pretty.total = createReport([ 0, 0, 0, 0, 1, 2, 0, 0, 0 ], 30);
					pretty._render();
					var expected = 'Total: [' + bar(pretty.total.results) + '-                    ]  9/30\n' +
						'Passed: 7   Failed: 1   Skipped: 1\n';
					assert.equal(mockCharm.out, expected);
				},

				'without logs': function () {
					pretty.total = createReport([ 0, 0, 0, 0, 1, 2, 0, 0, 0 ], 30);
					pretty.reporters = {
						1: createReport(
							[ 0, 0, 1 ], 10,
							new EnvironmentType({ browserName: 'chrome' })
						),
						2: createReport(
							[ 0, 0, 0 ], 10,
							new EnvironmentType({ browserName: 'firefox', version: '24.0.1' })
						),
						3: createReport(
							[ 2, 0, 0 ], 10,
							new EnvironmentType({ browserName: 'internet explorer', version: '11' })
						),
						4: createReport(
							[], 5,
							new EnvironmentType({ browserName: 'Unknown', platform: 'Windows' })
						)
					};
					pretty.sessions = ['1', '2', '3', '4'];
					pretty._render();

					var expected = 'Total: [' + bar(pretty.total.results) + '-                    ]  9/30\n' +
						'Passed: 7   Failed: 1   Skipped: 1\n' +
						'\n' +
						'Chr:        [' + bar(pretty.reporters[1].results) + '-      ]  3/10, 1 skip\n' +
						'Fx 24:      [' + bar(pretty.reporters[2].results) + '-      ]  3/10\n' +
						'IE 11:      [' + bar(pretty.reporters[3].results) + '-      ]  3/10, 1 fail\n' +
						'Unkn Win:   [-    ] 0/5\n';
					assert.equal(mockCharm.out, expected);
				},

				'with logs': function () {
					/* jshint maxlen: 160 */
					pretty.total = createReport([ 2, 2, 2, 2 ], 30);
					pretty.log = [
						'⚠ expected line',
						'× expected line',
						'× expected line\nsecond line',
						'! expected really long line with some really important stuff to say but we will never know ' +
							'because it is going to be truncated',
						'✓ line',
						'! expected line',
						'~ line'
					];
					pretty._render();

					var expected = 'Total: [' + bar(pretty.total.results) + '-                         ]  4/30\n' +
						'Passed: 0   Failed: 4   Skipped: 0\n' +
						'\n' +
						pretty.colorReplacement['⚠'] + '⚠ expected line\x1b[0m\n' +
						pretty.colorReplacement['×'] + '× expected line\x1b[0m\n' +
						pretty.colorReplacement['×'] + '× expected line\x1b[0m\n' +
						pretty.colorReplacement['!'] + '! expected really long line with some really important ' +
						'stuff to say but we will \x1b[0m\n' +
						pretty.colorReplacement['!'] + '! expected line\x1b[0m';
					assert.equal(mockCharm.out, expected);
				},

				'with tunnel status and header': function () {
					pretty.total = createReport([0, 0, 0, 0, 0], 30);
					pretty.tunnelState = 'tunnel';
					pretty.header = 'header';
					pretty._render();

					var expected = 'header\n' +
						'Tunnel: tunnel\n' +
						'\n' +
						'Total: [' + bar(pretty.total.results) + '-                        ]  5/30\n' +
						'Passed: 5   Failed: 0   Skipped: 0\n';
					assert.equal(mockCharm.out, expected);
				},

				'large progress bar becomes compressed': function () {
					var expected = 'Total: [' + pretty.colorReplacement[2] + '- ]   5/100\n' +
						'Passed: 2    Failed: 1    Skipped: 2\n';
					pretty.total = createReport([ 0, 1, 2, 1, 0 ], 100);
					pretty.dimensions = {
						width: 20,
						height: 5
					};
					pretty._render();
					assert.equal(mockCharm.out, expected);
				},

				'large progress bar exceeding maxAllowed is compressed': function () {
					var expected = 'Total: [' + bar(fillArray(40, 0)) + ']  99/100\n' +
						'Passed: 99   Failed: 0    Skipped: 0\n';
					pretty.total = createReport(fillArray(99, 0), 100);
					pretty.dimensions = {
						width: 100,
						height: 5
					};
					pretty._render();
					assert.equal(mockCharm.out, expected);
				},

				'spinner advances on each render': function () {
					function assertSpinner(spinner) {
						pretty._render();

						var expected = 'Total: [' + bar(pretty.total.results) + spinner + '    ]  5/10\n' +
							'Passed: 5   Failed: 0   Skipped: 0\n';
						assert.equal(mockCharm.out, expected);
						mockCharm.out = '';
					}

					pretty.total = createReport(fillArray(5, 0), 10);
					assertSpinner('-');
					assertSpinner('\\');
					assertSpinner('|');
					assertSpinner('/');
					assertSpinner('-');
				}
			},

			runStart: function () {
				try {
					pretty.dimensions = {};
					pretty.intern = { config: 'foo' };
					pretty.runStart();

					assert.isDefined(pretty.dimensions.width);
					assert.isDefined(pretty.dimensions.height);
					assert.isDefined(pretty._renderTimeout);
				}
				finally {
					clearTimeout(pretty._renderTimeout);
				}
			},

			runEnd: function () {
				var expected = pretty.colorReplacement['✓'] + '✓ 0\n' +
					pretty.colorReplacement['⚠'] + '⚠ 1\n' +
					pretty.colorReplacement['~'] + '~ 2\n' +
					pretty.colorReplacement['×'] + '× 3\n' +
					pretty.colorReplacement['!'] + '! 4\n\n' +
					'Total: Pending\n' +
					'Passed: 0  Failed: 0  Skipped: 0\n\n';
				var oldReporterWriteReport = Reporter.prototype.writeReport;
				Reporter.prototype.writeReport = createStub();

				try {
					pretty.log = ['! 4', '~ 2', '× 3', '⚠ 1', '✓ 0'];
					pretty.runEnd();
					assert.equal(mockCharm.out, expected);
					assert.lengthOf(Reporter.prototype.writeReport.args, 1);
				}
				finally {
					Reporter.prototype.writeReport = oldReporterWriteReport;
				}
			},

			'session based tests': (function () {
				var sessionId = 'sessionId';
				var sessionSuite = new Suite({
					remote: {
						environmentType: new EnvironmentType({ browserName: 'internet explorer', platform: 'WINDOWS' })
					},
					sessionId: sessionId
				});

				var expectedLog = {
					0: '✓ test',
					1: '~ test: Skipped',
					2: '× test\nError: Oops'
				};

				function assertTestResult(handlerName, result) {
					var suite = new Suite();
					var test = new Test({
						name: 'test',
						parent: suite,
						hasPassed: false,
						error: new Error('Oops'),
						skipped: 'Skipped'
					});
					suite.tests.push(test);

					return function () {
						// client unit tests
						pretty[handlerName](test);
						assert.lengthOf(pretty.total.results, 1);
						assert.lengthOf(pretty.log, 1);
						assert.strictEqual(pretty.log[0].split('\n', 2).join('\n'), expectedLog[result]);
						assert.strictEqual(pretty.total.results[0], result);

						// runner tests
						var reporter = pretty.reporters[sessionId];

						// set the suite's remote & sessionId so the reporter will treat it as a session suite
						suite.remote = {
							environmentType: new EnvironmentType({
								browserName: 'internet explorer',
								platform: 'WINDOWS'
							})
						};
						suite.sessionId = sessionId;

						pretty[handlerName](test);
						assert.lengthOf(pretty.total.results, 2);
						assert.lengthOf(pretty.log, 2);
						assert.strictEqual(pretty.log[1].split('\n', 2).join('\n'), expectedLog[result]);
						assert.strictEqual(pretty.total.results[1], result);
						assert.lengthOf(reporter.results, 1);
						assert.strictEqual(reporter.results[0], result);
					};
				}

				return {
					beforeEach: function () {
						pretty.suiteStart(sessionSuite);
					},

					coverage: function () {
						var sessionCoverageArgs = [];
						var totalCoverageArgs = [];
						pretty.reporters[sessionSuite.sessionId].coverage = {
							add: function (coverage) {
								sessionCoverageArgs.push(coverage);
							}
						};
						pretty.total.coverage = {
							add: function (coverage) {
								totalCoverageArgs.push(coverage);
							}
						};

						pretty.coverage(sessionId, mock.coverage);
						assert.lengthOf(sessionCoverageArgs, 1, 'Collector#add should have been called once');
						assert.strictEqual(sessionCoverageArgs[0], mock.coverage,
							'Collector#add should be called with the correct mockCoverage object');
						pretty.coverage('', mock.coverage);
						assert.lengthOf(sessionCoverageArgs, 1);
						assert.lengthOf(totalCoverageArgs, 2);
					},

					'new session': function () {
						var suite = {
							numTests: 10
						};
						// client unit tests
						pretty.suiteStart(suite);
						assert.strictEqual(pretty.total.numTotal, 10);

						// runner tests
						suite.remote = {
							environmentType: new EnvironmentType({
								browserName: 'internet explorer',
								platform: 'WINDOWS'
							})
						};
						suite.sessionId = sessionId;
						pretty.suiteStart(suite);
						assert.strictEqual(pretty.reporters[sessionId].numTotal, 10);
						assert.strictEqual(pretty.total.numTotal, 20);
					},

					testSkip: assertTestResult('testSkip', 1),
					testFail: assertTestResult('testFail', 2),
					testPass: assertTestResult('testPass', 0),

					tunnelStart: function () {
						pretty.tunnelStart();
						assert.strictEqual(pretty.tunnelState, 'Starting');
					},

					tunnelDownloadProgress: function () {
						pretty.tunnelDownloadProgress(undefined, {
							received: 99,
							numTotal: 100
						});
						assert.strictEqual(pretty.tunnelState, 'Downloading 99.00%');
					},

					tunnelStatus: function () {
						var status = 'hello world!';
						pretty.tunnelStatus(undefined, status);
						assert.strictEqual(pretty.tunnelState, status);
					},

					fatalError: function () {
						var error = new Error('error');
						pretty.fatalError(error);
						assert.lengthOf(pretty.log, 1);
						assert.match(pretty.log[0], /^! error\nError: error/);
					},

					deprecated: function () {
						pretty.deprecated('java', 'javascript');
						assert.lengthOf(pretty.log, 1);
						assert.strictEqual(pretty.log[0], '⚠ java is deprecated. Use javascript instead.');
					}
				};
			})()
		};
	});
});
