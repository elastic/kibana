define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/Suite',
	'../../../lib/Test',
	'dojo/Promise'
], function (registerSuite, assert, Suite, Test, Promise) {
	function createLifecycle(options) {
		options = options || {};

		var expectedLifecycle;

		if (options.publishAfterSetup) {
			expectedLifecycle = [
				'setup',
				'startTopic',
				'beforeEach',
				0,
				'afterEach',
				'beforeEach',
				1,
				'afterEach',
				'endTopic',
				'teardown',
				'done'
			];
		}
		else {
			expectedLifecycle = [
				'startTopic',
				'setup',
				'beforeEach',
				0,
				'afterEach',
				'beforeEach',
				1,
				'afterEach',
				'teardown',
				'endTopic',
				'done'
			];
		}

		return function () {
			var dfd = this.async(5000);
			var suite = new Suite(options);
			var results = [];

			[ 'setup', 'beforeEach', 'afterEach', 'teardown' ].forEach(function (method) {
				suite[method] = function () {
					results.push(method);
				};
			});

			[ 0, 1 ].forEach(function (i) {
				suite.tests.push(new Test({
					test: function () {
						results.push(i);
					},
					parent: suite
				}));
			});

			// TODO: Wrap function in dfd.rejectOnError once updated to Intern 3 instead of using inline try/catch
			suite.reporterManager = {
				emit: function (topic) {
					try {
						if (topic === 'suiteStart') {
							results.push('startTopic');
							assert.deepEqual(slice.call(arguments, 1), [ suite ],
								'Arguments broadcast to /suite/start should be the suite being executed');

							if (options.publishAfterSetup) {
								assert.deepEqual(results, [ 'setup', 'startTopic' ],
									'Suite start topic should broadcast after suite starts');
							}
							else {
								assert.deepEqual(results, [ 'startTopic' ],
									'Suite start topic should broadcast before suite starts');
							}
						}
						else if (topic === 'suiteEnd') {
							results.push('endTopic');
							assert.deepEqual(slice.call(arguments, 1), [ suite ],
								'Arguments broadcast to suiteEnd should be the suite being executed');
						}
					}
					catch (error) {
						dfd.reject(error);
					}

					return Promise.resolve();
				}
			};

			suite.run().then(dfd.callback(function () {
				results.push('done');
				assert.deepEqual(results, expectedLifecycle, 'Suite methods should execute in the correct order');
			}));
		};
	}

	function createSuite(options) {
		options = options || {};

		options.reporterManager = options.reporterManager || {
			emit: function () { return Promise.resolve(); }
		};

		var suite = new Suite(options);

		// tests need to have a parent suite or their attempts to emit topics
		// through their reporterManager will fail
		if (options.tests) {
			options.tests.forEach(function (test) {
				if (!test.parent) {
					test.parent = suite;
				}
			});
		}

		return suite;
	}

	function createSuiteThrows(method, options) {
		options = options || {};
		return function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var test = new Test({ test: function () {}, parent: suite });
			var thrownError = new Error('Oops');
			var finished = false;

			suite[method] = function () {
				if (options.async) {
					var dfd = new Promise.Deferred();

					setTimeout(function () {
						dfd.reject(thrownError);
					}, 20);

					return dfd.promise;
				}
				else {
					throw thrownError;
				}
			};

			suite.tests.push(test);

			suite.run().then(function () {
				finished = true;
				dfd.reject(new assert.AssertionError('Suite should never resolve after a fatal error in ' + method));
			}, dfd.callback(function (error) {
				finished = true;
				assert.strictEqual(suite.error, thrownError, 'Error thrown in ' + method +
					' should be the error set on suite');
				assert.strictEqual(error, thrownError, 'Error thrown in ' + method +
					' should be the error used by the promise');

				if (method === 'beforeEach' || method === 'afterEach') {
					assert.strictEqual(error.relatedTest, test, 'Error thrown in ' + method +
						' should have the related test in the error');
				}
			}));

			assert.isFalse(finished, 'Suite should not finish immediately after run()');
		};
	}

	var slice = Array.prototype.slice;

	registerSuite({
		name: 'intern/lib/Suite',

		'Suite lifecycle': createLifecycle(),

		'Suite lifecycle + publishAfterSetup': createLifecycle({ publishAfterSetup: true }),

		'Suite#setup': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var called = false;

			suite.setup = function () {
				called = true;
			};

			suite.run().then(dfd.callback(function () {
				assert.isTrue(called, 'Setup should be called before suite finishes');
			}));
		},

		'Suite#beforeEach': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var results = [];
			var counter = 0;

			function updateCount() {
				results.push('' + counter);
			}

			for (var i = 0; i < 2; ++i) {
				suite.tests.push(new Test({ test: updateCount, parent: suite }));
			}

			suite.beforeEach = function () {
				results.push('b' + (++counter));
			};

			suite.run().then(dfd.callback(function () {
				assert.deepEqual(results, [ 'b1', '1', 'b2', '2' ], 'beforeEach should execute before each test');
			}));

			assert.strictEqual(counter, 0, 'Suite#beforeEach should not be called immediately after run()');
		},

		'Suite#afterEach': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var results = [];
			var counter = 0;

			function updateCount() {
				results.push('' + (++counter));
			}

			for (var i = 0; i < 2; ++i) {
				suite.tests.push(new Test({ test: updateCount, parent: suite }));
			}

			suite.afterEach = function () {
				results.push('a' + counter);
			};

			suite.run().then(dfd.callback(function () {
				assert.deepEqual(results, [ '1', 'a1', '2', 'a2' ], 'afterEach should execute after each test');
			}));

			assert.strictEqual(counter, 0, 'Suite#afterEach should not be called immediately after run()');
		},

		'Suite#teardown': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var called = false;

			suite.teardown = function () {
				called = true;
			};

			suite.run().then(dfd.callback(function () {
				assert.isTrue(called, 'Synchronous teardown should be called before suite finishes');
			}));

			assert.isFalse(called, 'Suite#teardown should not be called immediately after run()');
		},

		'Suite#setup -> promise': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var waited = false;

			suite.setup = function () {
				var setupDfd = new Promise.Deferred();

				setTimeout(function () {
					waited = true;
					setupDfd.resolve();
				}, 20);

				return setupDfd.promise;
			};

			suite.run().then(dfd.callback(function () {
				assert.isTrue(waited, 'Asynchronous setup should be called before suite finishes');
			}));
		},

		'Suite#beforeEach -> promise': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var results = [];
			var counter = 0;

			function updateCount() {
				results.push('' + counter);
			}

			for (var i = 0; i < 2; ++i) {
				suite.tests.push(new Test({ test: updateCount, parent: suite }));
			}

			suite.beforeEach = function () {
				var beforeEachDfd = new Promise.Deferred();

				setTimeout(function () {
					results.push('b' + (++counter));
					beforeEachDfd.resolve();
				}, 20);

				return beforeEachDfd.promise;
			};

			suite.run().then(dfd.callback(function () {
				assert.deepEqual(results, [ 'b1', '1', 'b2', '2' ], 'beforeEach should execute before each test');
			}));
		},

		'Suite#afterEach -> promise': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var results = [];
			var counter = 0;

			function updateCount() {
				results.push('' + (++counter));
			}

			for (var i = 0; i < 2; ++i) {
				suite.tests.push(new Test({ test: updateCount, parent: suite }));
			}

			suite.afterEach = function () {
				var afterEachDfd = new Promise.Deferred();

				setTimeout(function () {
					results.push('a' + counter);
					afterEachDfd.resolve();
				}, 20);

				return afterEachDfd.promise;
			};

			suite.run().then(dfd.callback(function () {
				assert.deepEqual(results, [ '1', 'a1', '2', 'a2' ], 'afterEach should execute after each test');
			}));
		},

		'Suite#teardown -> promise': function () {
			var dfd = this.async(1000);
			var suite = createSuite();
			var waited = false;

			suite.teardown = function () {
				var teardownDfd = new Promise.Deferred();

				setTimeout(function () {
					waited = true;
					teardownDfd.resolve();
				}, 20);

				return teardownDfd.promise;
			};

			suite.run().then(dfd.callback(function () {
				assert.isTrue(waited, 'Asynchronous teardown should be called before suite finishes');
			}));
		},

		'Suite#name': function () {
			var suite = new Suite({ name: 'foo', parent: new Suite({ name: 'parent' }) });
			assert.strictEqual(suite.name, 'foo', 'Suite#name should return correct suite name');
		},

		'Suite#id': function () {
			var suite = new Suite({ name: 'foo', parent: new Suite({ name: 'parent' }) });
			assert.strictEqual(suite.id, 'parent - foo', 'Suite#id should return correct suite id');
		},

		'Suite#setup throws': createSuiteThrows('setup'),

		'Suite#beforeEach throws': createSuiteThrows('beforeEach'),

		'Suite#afterEach throws': createSuiteThrows('afterEach'),

		'Suite#teardown throws': createSuiteThrows('teardown'),

		'Suite#setup -> promise rejects': createSuiteThrows('setup', { async: true }),

		'Suite#beforeEach -> promise rejects': createSuiteThrows('beforeEach', { async: true }),

		'Suite#afterEach -> promise rejects': createSuiteThrows('afterEach', { async: true }),

		'Suite#teardown -> promise rejects': createSuiteThrows('teardown', { async: true }),

		'Suite#constructor topic': function () {
			var topicFired = false;
			var actualSuite;
			var reporterManager = {
				emit: function (topic, suite) {
					if (topic === 'newSuite') {
						topicFired = true;
						actualSuite = suite;
					}
				}
			};

			var expectedSuite = new Suite({ reporterManager: reporterManager });
			assert.isTrue(topicFired, 'newSuite should be reported after a suite is created');
			assert.strictEqual(actualSuite, expectedSuite, 'newSuite should be passed the suite that was just created');
		},

		'Suite#remote': function () {
			var parentRemote = { session: { sessionId: 'remote' } };
			var parentSuite = new Suite({ remote: parentRemote });
			var mockRemote = { session: { sessionId: 'local' } };
			var suite = new Suite({ remote: mockRemote });
			var thrown = false;

			assert.strictEqual(suite.remote, mockRemote, 'Suite#remote should come from suite when set');

			suite.parent = parentSuite;

			assert.strictEqual(suite.remote, parentRemote, 'Suite#remote from parent should override local value');

			try {
				suite.remote = mockRemote;
			}
			catch (e) {
				thrown = true;
			}

			assert.isTrue(thrown, 'An error should be thrown when Suite#remote is set more than once');
		},

		'Suite#sessionId': function () {
			var suite = new Suite({ name: 'foo' });
			assert.strictEqual(suite.sessionId, null,
				'Suite#sessionId should be null if the suite is not associated with a session');

			suite.remote = { session: { sessionId: 'remote' } };
			assert.strictEqual(suite.sessionId, 'remote', 'Suite#sessionId should come from remote if one exists');

			suite.sessionId = 'local';
			assert.strictEqual(suite.sessionId, 'local',
				'Suite#sessionId from the suite itself should override remote');

			suite.parent = new Suite({ sessionId: 'parent' });
			assert.strictEqual(suite.sessionId, 'parent',
				'Suite#sessionId from the parent should override the suite itself');
		},

		'Suite#numTests / numFailedTests': function () {
			var suite = new Suite({
				name: 'foo',
				tests: [
					createSuite({ tests: [ new Test({ hasPassed: false }), new Test({ hasPassed: true }) ] }),
					new Test({ hasPassed: false }),
					new Test({ hasPassed: true })
				]
			});

			assert.strictEqual(suite.numTests, 4,
				'Suite#numTests should return the correct number of tests, including those from nested suites');
			assert.strictEqual(suite.numFailedTests, 2,
				'Suite#numFailedTests returns the correct number of failed tests, including those from nested suites');
		},

		'Suite#numSkippedTests': function () {
			var suite = new Suite({
				name: 'foo',
				tests: [
					new Suite({ tests: [
						new Test({ skipped: null, hasPassed: true }),
						new Test({ skipped: 'skipped', hasPassed: true })
					] }),
					new Test({ skipped: null, hasPassed: true }),
					new Test({ skipped: 'skipped', hasPassed: false })
				]
			});

			assert.strictEqual(suite.numTests, 4,
				'Suite#numTests should return the correct number of tests, including those from nested suites');
			assert.strictEqual(suite.numSkippedTests, 2,
				'Suite#numSkippedTests returns the correct number of skipped tests, ' +
				'including those from nested suites');
			assert.strictEqual(suite.numFailedTests, 0,
				'Suite#numFailedTests returns the correct number of failed tests, including those from nested suites');
		},

		'Suite#beforeEach and #afterEach nesting': function () {
			var dfd = this.async(5000);
			var outerTest = new Test({
				name: 'outerTest',
				test: function () {
					actualLifecycle.push('outerTest');
				}
			});
			var innerTest = new Test({
				name: 'innerTest',
				test: function () {
					actualLifecycle.push('innerTest');
				}
			});
			var suite = new Suite({
				setup: function () {
					actualLifecycle.push('outerSetup');
				},
				beforeEach: function (test) {
					var dfd = new Promise.Deferred();
					setTimeout(function () {
						actualLifecycle.push(test.name + 'OuterBeforeEach');
						dfd.resolve();
					}, 100);
					return dfd.promise;
				},
				tests: [ outerTest ],
				afterEach: function (test) {
					actualLifecycle.push(test.name + 'OuterAfterEach');
				},
				teardown: function () {
					actualLifecycle.push('outerTeardown');
				}
			});
			var childSuite = createSuite({
				parent: suite,
				setup: function () {
					actualLifecycle.push('innerSetup');
				},
				beforeEach: function (test) {
					actualLifecycle.push(test.name + 'InnerBeforeEach');
				},
				tests: [ innerTest ],
				afterEach: function (test) {
					var dfd = new Promise.Deferred();
					setTimeout(function () {
						actualLifecycle.push(test.name + 'InnerAfterEach');
						dfd.resolve();
					}, 100);
					return dfd.promise;
				},
				teardown: function () {
					actualLifecycle.push('innerTeardown');
				}
			});
			var expectedLifecycle = [
				'outerSetup',
				'outerTestOuterBeforeEach', 'outerTest', 'outerTestOuterAfterEach',
				'innerSetup',
				'innerTestOuterBeforeEach', 'innerTestInnerBeforeEach',
				'innerTest',
				'innerTestInnerAfterEach', 'innerTestOuterAfterEach',
				'innerTeardown',
				'outerTeardown'
			];
			var actualLifecycle = [];

			suite.tests.push(childSuite);
			suite.run().then(dfd.callback(function () {
				assert.deepEqual(
					actualLifecycle,
					expectedLifecycle,
					'Nested beforeEach and afterEach should execute in a pyramid, ' +
					'with the test passed to beforeEach and afterEach'
				);
			}, function () {
				dfd.reject(new assert.AssertionError('Suite should not fail'));
			}));
		},

		'Suite#afterEach nesting with errors': function () {
			var dfd = this.async(1000);
			var suite = createSuite({
				afterEach: function () {
					actualLifecycle.push('outerAfterEach');
				}
			});
			var childSuite = createSuite({
				parent: suite,
				tests: [ new Test({ test: function () {
					actualLifecycle.push('test');
				} }) ],
				afterEach: function () {
					actualLifecycle.push('innerAfterEach');
					throw new Error('Oops');
				}
			});
			var expectedLifecycle = [ 'test', 'innerAfterEach', 'outerAfterEach' ];
			var actualLifecycle = [];

			suite.tests.push(childSuite);
			suite.run().then(dfd.callback(function () {
				assert.deepEqual(actualLifecycle, expectedLifecycle,
					'Outer afterEach should execute even though inner afterEach threw an error');
				assert.strictEqual(childSuite.error.message, 'Oops',
					'Suite with afterEach failure should hold the last error from afterEach');
			}, function () {
				dfd.reject(new assert.AssertionError('Suite should not fail'));
			}));
		},

		'Suite#run skip': function () {
			var dfd = this.async(5000);
			var grep = /foo/;
			var suite = createSuite({
				grep: grep
			});
			var testsRun = [];
			var fooTest = new Test({
				name: 'foo',
				parent: suite,
				test: function () {
					testsRun.push(this);
				}
			});
			var barSuite = createSuite({
				name: 'bar',
				parent: suite,
				grep: grep,
				tests: [
					new Test({
						name: 'foo',
						test: function () {
							testsRun.push(this);
						}
					}),
					new Test({
						name: 'baz',
						test: function () {
							testsRun.push(this);
						}
					})
				]
			});
			var foodTest = new Test({
				name: 'food',
				parent: suite,
				test: function () {
					testsRun.push(this);
				}
			});

			suite.tests.push(fooTest);
			suite.tests.push(barSuite);
			suite.tests.push(foodTest);

			suite.run().then(dfd.callback(function () {
				assert.deepEqual(testsRun, [ fooTest, barSuite.tests[0], foodTest ],
					'Only test matching grep regex should have run');
			}, function () {
				dfd.reject(new assert.AssertionError('Suite should not fail'));
			}));
		}
	});
});
