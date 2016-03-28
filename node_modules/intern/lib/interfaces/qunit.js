define([
	'dojo/aspect',
	'dojo/lang',
	'dojo/Promise',
	'../../chai!assert',
	'../../main',
	'../Suite',
	'../Test',
	'../util'
], function (aspect, lang, Promise, assert, main, Suite, Test, util) {
	var currentSuites;

	function registerTest(name, test) {
		currentSuites.forEach(function (suite) {
			suite.tests.push(new Test({
				name: name,
				parent: suite,
				test: test
			}));
		});
	}

	function wrapChai(name) {
		return function () {
			// TODO: Could try/catch errors to make them act more like the way QUnit acts, where an assertion failure
			// does not fail the test, but not sure of the best way to get multiple assertion failures out of a test
			// like that
			++this._numAssertions;
			assert[name].apply(assert, arguments);
		};
	}

	var baseAssert = {
		_expectedAssertions: NaN,
		_numAssertions: 0,

		deepEqual: wrapChai('deepEqual'),
		equal: wrapChai('equal'),
		expect: function (numTotal) {
			if (arguments.length === 1) {
				this._expectedAssertions = numTotal;
			}
			else {
				return this._expectedAssertions;
			}
		},
		notDeepEqual: wrapChai('notDeepEqual'),
		notEqual: wrapChai('notEqual'),
		notPropEqual: wrapChai('notDeepEqual'),
		notStrictEqual: wrapChai('notStrictEqual'),
		ok: wrapChai('ok'),
		push: function (ok, actual, expected, message) {
			++this._numAssertions;
			if (!ok) {
				throw new assert.AssertionError(message, { actual: actual, expected: expected });
			}
		},
		propEqual: wrapChai('propEqual'),
		strictEqual: wrapChai('strictEqual'),
		throws: (function () {
			var throws = wrapChai('throws');
			return function (fn, expected, message) {
				if (typeof expected === 'function') {
					++this._numAssertions;
					try {
						fn();
						throw new assert.AssertionError(
							(message ? message + ': ' : '') +
							'expected [Function] to throw'
						);
					}
					catch (error) {
						if (!expected(error)) {
							throw new assert.AssertionError(
								(message ? message + ': ' : '') +
								'expected [Function] to throw error matching [Function] but got ' +
								(error instanceof Error ? error.toString() : error)
							);
						}
					}
				}
				else {
					throws.apply(this, arguments);
				}
			};
		})(),
		raises: function () {
			return this.throws.apply(this, arguments);
		},

		verifyAssertions: function () {
			if (isNaN(this._expectedAssertions) && QUnit.config.requireExpects) {
				throw new assert.AssertionError('Expected number of assertions to be defined, but expect() was ' +
					'not called.');
			}

			if (!isNaN(this._expectedAssertions) && this._numAssertions !== this._expectedAssertions) {
				throw new assert.AssertionError('Expected ' + this._expectedAssertions + ' assertions, but ' +
					this._numAssertions + ' were run');
			}
		}
	};

	var autostartHandle;

	var QUnit = {
		assert: baseAssert,
		config: {
			get autostart() {
				return !autostartHandle;
			},
			set autostart(value) {
				if (autostartHandle) {
					autostartHandle.remove();
					autostartHandle = null;
				}

				if (!value) {
					autostartHandle = aspect.after(main.executor.config, 'before', function (waitGuard) {
						return new Promise(function (resolve) {
							QUnit.start = function () {
								if (waitGuard && waitGuard.then) {
									waitGuard.then(function () {
										resolve();
									});
								}
								else {
									resolve();
								}
							};
						});
					});
					QUnit.start = function () {
						autostartHandle.remove();
						autostartHandle = null;
						QUnit.start = function () {};
					};
				}
			},
			_module: null,
			get module() {
				return this._module;
			},
			set module(value) {
				this._module = value;
				main.executor.register(function (suite) {
					suite.grep = new RegExp('(?:^|[^-]* - )' + util.escapeRegExp(value) + ' - ', 'i');
				});
			},
			requireExpects: false,
			testTimeout: Infinity
		},

		extend: function (target, mixin, skipExistingTargetProperties) {
			for (var key in mixin) {
				if (mixin.hasOwnProperty(key)) {
					if (mixin[key] === undefined) {
						delete target[key];
					}
					else if (!skipExistingTargetProperties || target[key] === undefined) {
						target[key] = mixin[key];
					}
				}
			}
			return target;
		},

		start: function () {},

		// test registration
		asyncTest: function (name, test) {
			registerTest(name, function () {
				this.timeout = QUnit.config.testTimeout;

				var numCallsUntilResolution = 1;
				var dfd = this.async();
				var testAssert = lang.delegate(baseAssert, { _expectedAssertions: NaN, _numAssertions: 0 });

				QUnit.stop = function () {
					++numCallsUntilResolution;
				};
				QUnit.start = dfd.rejectOnError(function () {
					if (--numCallsUntilResolution === 0) {
						try {
							testAssert.verifyAssertions();
							dfd.resolve();
						}
						finally {
							QUnit.stop = QUnit.start = function () {};
						}
					}
				});

				try {
					test.call(this.parent._qunitContext, testAssert);
				}
				catch (error) {
					dfd.reject(error);
				}
			});
		},
		module: function (name, lifecycle) {
			currentSuites = [];
			main.executor.register(function (parentSuite) {
				var suite = new Suite({ name: name, parent: parentSuite, _qunitContext: {} });
				parentSuite.tests.push(suite);
				currentSuites.push(suite);

				if (lifecycle) {
					if (lifecycle.setup) {
						aspect.after(suite, 'beforeEach', function () {
							lifecycle.setup.call(this._qunitContext);
						});
					}

					if (lifecycle.teardown) {
						aspect.after(suite, 'afterEach', function () {
							lifecycle.teardown.call(this._qunitContext);
						});
					}
				}
			});
		},
		test: function (name, test) {
			registerTest(name, function () {
				var testAssert = lang.delegate(baseAssert, { _expectedAssertions: NaN, _numAssertions: 0 });
				test.call(this.parent._qunitContext, testAssert);
				testAssert.verifyAssertions();
			});
		},

		// callbacks
		begin: function (callback) {
			main.executor.reporterManager.on('runStart', function (executor) {
				var numTests = executor.suites.reduce(function (numTests, suite) {
					return numTests + suite.numTests;
				}, 0);

				callback({ totalTests: numTests });
			});
		},
		done: function (callback) {
			main.executor.reporterManager.on('runEnd', function (executor) {
				var numFailedTests = executor.suites.reduce(function (numTests, suite) {
					return numTests + suite.numFailedTests;
				}, 0);
				var numTests = executor.suites.reduce(function (numTests, suite) {
					return numTests + suite.numTests;
				}, 0);
				var numSkippedTests = executor.suites.reduce(function (numTests, suite) {
					return numTests + suite.numSkippedTests;
				}, 0);
				var timeElapsed = Math.max.apply(null, executor.suites.map(function (suite) {
					return suite.timeElapsed;
				}));

				callback({
					failed: numFailedTests,
					passed: numTests - numFailedTests - numSkippedTests,
					total: numTests,
					runtime: timeElapsed
				});
			});
		},
		log: function (callback) {
			main.executor.reporterManager.on('testEnd', function (test) {
				callback({
					result: test.hasPassed,
					actual: test.error && test.error.actual,
					expected: test.error && test.error.expected,
					message: test.error && test.error.message,
					source: test.error && test.error.stack,
					module: test.parent.name,
					name: test.name
				});
			});
		},
		moduleDone: function (callback) {
			main.executor.reporterManager.on('suiteEnd', function (suite) {
				if (suite._qunitContext) {
					callback({
						name: suite.name,
						failed: suite.numFailedTests,
						passed: suite.numTests - suite.numFailedTests - suite.numSkippedTests,
						total: suite.numTests,
						runtime: suite.timeElapsed
					});
				}
			});
		},
		moduleStart: function (callback) {
			main.executor.reporterManager.on('suiteStart', function (suite) {
				if (suite._qunitContext) {
					callback({
						name: suite.name
					});
				}
			});
		},
		testDone: function (callback) {
			main.executor.reporterManager.on('testEnd', function (test) {
				callback({
					name: test.name,
					module: test.parent.name,
					failed: test.hasPassed ? 0 : 1,
					passed: test.hasPassed ? 1 : 0,
					total: 1,
					runtime: test.timeElapsed
				});
			});
		},
		testStart: function (callback) {
			main.executor.reporterManager.on('testStart', function (test) {
				callback({
					name: test.name,
					module: test.parent.name
				});
			});
		}
	};

	return QUnit;
});
