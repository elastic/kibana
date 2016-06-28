define([
	'dojo/Promise'
], function (Promise) {
	function Test(kwArgs) {
		for (var k in kwArgs) {
			this[k] = kwArgs[k];
		}

		this.reporterManager && this.reporterManager.emit('newTest', this);
	}

	var SKIP = {};

	Test.prototype = {
		constructor: Test,
		name: null,
		test: null,
		parent: null,
		isAsync: false,
		timeElapsed: null,
		hasPassed: false,
		skipped: null,
		error: null,

		/**
		 * The unique identifier of the test, assuming all combinations of suite + test are unique.
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
		 * The WebDriver interface for driving a remote environment.
		 * @see Suite#remote
		 */
		get remote() {
			return this.parent.remote;
		},

		get reporterManager() {
			return this.parent && this.parent.reporterManager;
		},

		get sessionId() {
			return this.parent.sessionId;
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
		 * A convenience function that generates and returns a special Deferred that can be used for asynchronous
		 * testing.
		 * Once called, a test is assumed to be asynchronous no matter its return value (the generated Deferred's
		 * promise will always be used as the implied return value if a promise is not returned by the test function).
		 *
		 * @param timeout
		 * If provided, the amount of time to wait before rejecting the test with a timeout error, in milliseconds.
		 *
		 * @param numCallsUntilResolution
		 * The number of times that resolve needs to be called before the Deferred is actually resolved.
		 *
		 * @returns {module:dojo/Promise.Deferred}
		 */
		async: function (/**?number*/ timeout, /**?number */ numCallsUntilResolution) {
			this.isAsync = true;

			if (timeout != null) {
				this.timeout = timeout;
			}

			if (!numCallsUntilResolution) {
				numCallsUntilResolution = 1;
			}

			var dfd = new Promise.Deferred(function (reason) {
				throw reason;
			});
			var oldResolve = dfd.resolve;

			/**
			 * Eventually resolves the deferred, once `resolve` has been called as many times as specified by the
			 * `numCallsUntilResolution` parameter of the original `async` call.
			 */
			dfd.resolve = function () {
				--numCallsUntilResolution;
				if (numCallsUntilResolution === 0) {
					oldResolve.apply(this, arguments);
				}
				else if (numCallsUntilResolution < 0) {
					throw new Error('resolve called too many times');
				}
			};

			/**
			 * Wraps any callback to resolve the deferred so long as the callback executes without throwing any Errors.
			 */
			dfd.callback = function (callback) {
				var self = this;
				return self.rejectOnError(function () {
					var returnValue = callback.apply(this, arguments);
					self.resolve();
					return returnValue;
				});
			};

			/**
			 * Wraps a callback to reject the deferred if the callback throws an Error.
			 */
			dfd.rejectOnError = function (callback) {
				var self = this;
				return function () {
					try {
						return callback.apply(this, arguments);
					}
					catch (error) {
						self.reject(error);
					}
				};
			};

			// A test may call this function multiple times and should always get the same Deferred
			this.async = function () {
				return dfd;
			};

			return dfd;
		},

		/**
		 * During an asynchronous test run, restarts the timeout timer.
		 * @param {number} timeout
		 */
		restartTimeout: function (timeout) {
			timeout = timeout == null ? this.timeout : timeout;

			if (this._runTask) {
				var self = this;
				clearTimeout(this._timer);
				this._timer = setTimeout(function () {
					if (self._runTask) {
						var reason = new Error('Timeout reached on ' + self.id);
						reason.name = 'CancelError';
						self._runTask.cancel(reason);
					}
				}, timeout != null ? timeout : self.timeout);
			}
			else {
				this.timeout = timeout;
			}
		},

		/**
		 * Runs the test.
		 * @returns {dojo/promise/Promise}
		 */
		run: function () {
			var reporterManager = this.reporterManager;
			var self = this;
			var startTime;

			function end() {
				return report('testEnd');
			}

			function report(eventName) {
				if (reporterManager) {
					var args = [ eventName, self ].concat(Array.prototype.slice.call(arguments, 1));
					return reporterManager.emit.apply(reporterManager, args).catch(function () {});
				}
				else {
					return Promise.resolve();
				}
			}

			function start() {
				return report('testStart').then(function () {
					startTime = Date.now();
				});
			}

			// Reset some state in case someone tries to re-run the same test
			// TODO: Cancel any previous outstanding test run
			// TODO: Test
			this.async = Object.getPrototypeOf(this).async;
			this.hasPassed = this.isAsync = false;
			this.error = this.skipped = this.timeElapsed = null;

			return start()
				.then(function () {
					var result = self.test();

					// Someone called `this.async`, so this test is async; we have to prefer one or the other, so
					// prefer the promise returned from the test function if it exists, otherwise get the one that was
					// generated by `Test#async`
					if (self.isAsync && (!result || !result.then)) {
						result = self.async().promise;
					}

					if (result && result.then) {
						// If a user did not call `this.async` but returned a promise we still want to mark this
						// test as asynchronous for informational purposes
						self.isAsync = true;

						// The `result` promise is wrapped in order to allow timeouts to work when a user returns a
						// Promise from somewhere else that does not support cancellation
						self._runTask = new Promise(function (resolve, reject, progress, setCanceler) {
							setCanceler(function (reason) {
								// Dojo 2 promises are designed to allow extra signalling if a task has to perform
								// cleanup when it is cancelled; some others, including Dojo 1 promises, do not. In
								// order to ensure that a timed out test is never accidentally resolved, always throw
								// or re-throw the cancel reason
								if (result.cancel) {
									var returnValue = result.cancel(reason);
									if (returnValue && returnValue.finally) {
										return returnValue.finally(function () {
											throw reason;
										});
									}
								}

								throw reason;
							});

							result.then(resolve, reject);
						});

						self.restartTimeout();
						return self._runTask;
					}
				})
				.finally(function () {
					self.timeElapsed = Date.now() - startTime;
					clearTimeout(self._timer);
					self._timer = self._runTask = null;
				})
				.then(function () {
					self.hasPassed = true;
					return report('testPass');
				}, function (error) {
					if (error === SKIP) {
						return report('testSkip');
					}
					else {
						self.error = error;
						// TODO: If a test fails it probably should not reject the `run` promise unless the failure was
						// inside the test system itself (and not just a test failure)
						return report('testFail').then(function () {
							throw error;
						});
					}
				})
				.finally(end);
		},

		/**
		 * Skips this test.
		 *
		 * @param {String} message
		 * If provided, will be stored in this test's `skipped` property.
		 */
		skip: function (message) {
			this.skipped = message || '';
			throw SKIP;
		},

		toJSON: function () {
			return {
				name: this.name,
				sessionId: this.sessionId,
				id: this.id,
				timeout: this.timeout,
				timeElapsed: this.timeElapsed,
				hasPassed: this.hasPassed,
				skipped: this.skipped,
				error: this.error ? {
					name: this.error.name,
					message: this.error.message,
					stack: this.error.stack
				} : null
			};
		}
	};

	return Test;
});
