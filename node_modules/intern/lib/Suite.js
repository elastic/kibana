define([
	'dojo/Promise',
	'dojo/lang'
], function (Promise, lang) {
	function Suite(kwArgs) {
		this.tests = [];
		for (var k in kwArgs) {
			this[k] = kwArgs[k];
		}

		this.reporterManager && this.reporterManager.emit('newSuite', this);
	}

	Suite.prototype = {
		constructor: Suite,
		name: null,
		tests: [],
		parent: null,
		setup: null,
		beforeEach: null,
		afterEach: null,
		teardown: null,
		error: null,
		timeElapsed: null,
		_grep: null,
		_remote: null,
		_environmentType: null,
		_reporterManager: null,

		/**
		 * If true, the suite will only publish its start topic after the setup callback has finished,
		 * and will publish its end topic before the teardown callback has finished.
		 */
		publishAfterSetup: false,

		/**
		 * A regular expression used to filter, by test ID, which tests are run.
		 */
		get grep() {
			return this._grep || (this.parent && this.parent.grep) || /.*/;
		},

		set grep(value) {
			this._grep = value;
		},

		/**
		 * The unique identifier of the suite, assuming all combinations of suite + test are unique.
		 */
		get id() {
			var name = [];
			var object = this;

			do {
				object.name != null && name.unshift(object.name);
			} while ((object = object.parent));

			return name.join(' - ');
		},

		/**
		 * The WebDriver interface for driving a remote environment. This value is only guaranteed to exist from the
		 * setup/beforeEach/afterEach/teardown and test methods, since environments are not instantiated until they are
		 * actually ready to be tested against.
		 */
		get remote() {
			return (this.parent && this.parent.remote) ? this.parent.remote : this._remote;
		},

		set remote(value) {
			if (this._remote) {
				throw new Error('remote may only be set once per suite');
			}

			Object.defineProperty(this, '_remote', { value: value });
		},

		/**
		 * The reporter manager that should receive lifecycle events from the Suite.
		 */
		get reporterManager() {
			return this._reporterManager || (this.parent && this.parent.reporterManager);
		},

		set reporterManager(value) {
			if (this._reporterManager) {
				throw new Error('reporterManager may only be set once per suite');
			}

			Object.defineProperty(this, '_reporterManager', { value: value });
		},

		/**
		 * The sessionId of the environment in which the suite executed.
		 */
		get sessionId() {
			return this.parent ? this.parent.sessionId :
				this._sessionId ? this._sessionId :
				this.remote ? this.remote.session.sessionId :
				null;
		},

		/**
		 * The sessionId may need to be overridden for suites proxied from client.js.
		 */
		set sessionId(value) {
			Object.defineProperty(this, '_sessionId', { value: value });
		},

		/**
		 * The total number of tests in this suite and any sub-suites. To get only the number of tests for this suite,
		 * look at `this.tests.length`.
		 */
		get numTests() {
			function reduce(numTests, test) {
				return test.tests ? test.tests.reduce(reduce, numTests) : numTests + 1;
			}

			return this.tests.reduce(reduce, 0);
		},

		/**
		 * The total number of tests in this test suite and any sub-suites that have failed.
		 */
		get numFailedTests() {
			function reduce(numFailedTests, test) {
				return test.tests ?
					test.tests.reduce(reduce, numFailedTests) :
					(test.hasPassed || test.skipped != null ? numFailedTests : numFailedTests + 1);
			}

			return this.tests.reduce(reduce, 0);
		},

		/**
		 * The total number of tests in this test suite and any sub-suites that were skipped.
		 */
		get numSkippedTests() {
			function reduce(numSkippedTests, test) {
				return test.tests ?
					test.tests.reduce(reduce, numSkippedTests) :
					(test.skipped != null ? numSkippedTests + 1 : numSkippedTests);
			}

			return this.tests.reduce(reduce, 0);
		},

		/**
		 * Whether or not this suite has a parent (for parity with serialized Suites).
		 */
		get hasParent() {
			return Boolean(this.parent);
		},

		get timeout() {
			if (this._timeout != null) {
				return this._timeout;
			}
			else if (this.parent) {
				return this.parent.timeout;
			}
			else {
				return 30000;
			}
		},

		set timeout(value) {
			this._timeout = value;
		},

		/**
		 * Runs test suite in order:
		 *
		 * * setup
		 * * for each test:
		 *   * beforeEach
		 *   * test
		 *   * afterEach
		 * * teardown
		 *
		 * If setup, beforeEach, afterEach, or teardown throw, the suite itself will be marked as failed
		 * and no further tests in the suite will be executed.
		 *
		 * @returns {module:dojo/Promise}
		 */
		run: function () {
			var reporterManager = this.reporterManager;
			var self = this;
			var startTime;

			function end() {
				self.timeElapsed = Date.now() - startTime;
				return report('suiteEnd');
			}

			function report(eventName) {
				if (reporterManager) {
					var args = [ eventName, self ].concat(Array.prototype.slice.call(arguments, 1));
					return reporterManager.emit.apply(reporterManager, args);
				}
				else {
					return Promise.resolve();
				}
			}

			function reportSuiteError(error) {
				self.error = error;
				return report('suiteError', error).then(function () {
					throw error;
				});
			}

			function runTestLifecycle(name, test) {
				// beforeEach executes in order parent -> child;
				// afterEach executes in order child -> parent
				var orderMethod = name === 'beforeEach' ? 'push' : 'unshift';

				// LIFO queue
				var suiteQueue = [];
				var suite = self;

				do {
					suiteQueue[orderMethod](suite);
				}
				while ((suite = suite.parent));

				return new Promise(function (resolve, reject, progress, setCanceler) {
					var current;
					var firstError;

					setCanceler(function (reason) {
						suiteQueue.splice(0, suiteQueue.length);
						if (current) {
							current.cancel(reason);
							// Wait for the current lifecycle to finish, then reject
							return current.finally(function () {
								throw reason;
							});
						}
						throw reason;
					});

					function handleError(error) {
						if (name === 'afterEach') {
							firstError = firstError || error;
							next();
						}
						else {
							reject(error);
						}
					}

					function next() {
						var suite = suiteQueue.pop();

						if (!suite) {
							firstError ? reject(firstError) : resolve();
							return;
						}

						function runWithCatch() {
							return new Promise(function (resolve) {
								resolve(suite[name] && suite[name](test));
							}).catch(reportSuiteError);
						}

						current = runWithCatch().then(next, handleError);
					}

					next();
				});
			}

			function runTests() {
				var i = 0;
				var tests = self.tests;

				return new Promise(function (resolve, reject, progress, setCanceler) {
					var current;
					var firstError;

					setCanceler(function (reason) {
						i = Infinity;
						if (current) {
							current.cancel(reason);
							// Wait for the current test to finish, then reject
							return current.finally(function () {
								throw reason;
							});
						}
						throw reason;
					});

					function next() {
						var test = tests[i++];

						if (!test) {
							firstError ? reject(firstError) : resolve();
							return;
						}

						function reportAndContinue(error) {
							// An error may be associated with a deeper test already, in which case we do not
							// want to reassociate it with a more generic parent
							if (!error.relatedTest) {
								error.relatedTest = test;
							}
						}

						function runWithCatch() {
							// Errors raised when running child tests should be reported but should not cause
							// this suite’s run to reject, since this suite itself has not failed.
							try {
								return test.run().catch(reportAndContinue);
							}
							catch (error) {
								return reportAndContinue(error);
							}
						}

						if (test.tests) {
							current = runWithCatch();
						}
						else {
							if (!self.grep.test(test.id)) {
								test.skipped = 'grep';
								next();
								return;
							}

							current = runTestLifecycle('beforeEach', test)
								.then(runWithCatch)
								.finally(function () {
									return runTestLifecycle('afterEach', test);
								})
								.catch(function (error) {
									firstError = firstError || error;
									return reportAndContinue(error);
								});
						}

						current.then(next);
					}

					next();
				});
			}

			function setup() {
				return new Promise(function (resolve) {
					resolve(self.setup && self.setup());
				}).catch(reportSuiteError);
			}

			function start() {
				return report('suiteStart').then(function () {
					startTime = Date.now();
				});
			}

			function teardown() {
				return new Promise(function (resolve) {
					resolve(self.teardown && self.teardown());
				}).catch(reportSuiteError);
			}

			// Reset some state in case someone tries to re-run the same suite
			// TODO: Cancel any previous outstanding suite run
			// TODO: Test
			this.error = this.timeElapsed = null;

			return (function () {
				if (!self.publishAfterSetup) {
					return start().then(setup);
				}
				else {
					return setup().then(start);
				}
			})()
			.then(runTests)
			.finally(function () {
				if (self.publishAfterSetup) {
					return end().then(teardown);
				}
				else {
					return teardown().then(end);
				}
			})
			.then(function () {
				return self.numFailedTests;
			});
		},

		toJSON: function () {
			return {
				name: this.name,
				id: this.id,
				sessionId: this.sessionId,
				hasParent: Boolean(this.parent),
				tests: this.tests.map(function (test) {
					return test.toJSON();
				}),
				timeElapsed: this.timeElapsed,
				numTests: this.numTests,
				numFailedTests: this.numFailedTests,
				numSkippedTests: this.numSkippedTests,
				error: this.error ? {
					name: this.error.name,
					message: this.error.message,
					stack: this.error.stack,
					relatedTest: this.error.relatedTest
				} : null
			};
		}
	};

	return Suite;
});
