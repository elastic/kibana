/* jshint node:true */
define([
	'dojo/lang',
	'dojo/Promise',
	'dojo/node!url',
	'dojo/node!path',
	'dojo/aspect',
	'dojo/io-query',
	'./Suite'
], function (lang, Promise, urlUtil, pathUtil, aspect, ioQuery, Suite) {
	function ClientSuite() {
		this.config = {};

		Suite.apply(this, arguments);
	}

	var _super = Suite.prototype;
	ClientSuite.prototype = lang.mixin(Object.create(_super), /** @lends module:intern/lib/ClientSuite# */ {
		constructor: ClientSuite,
		name: 'unit tests',
		timeout: Infinity,
		args: null,
		config: null,
		proxy: null,

		// TODO: Change this from using Selenium-provided sessionId to self-generated constant identifier so that
		// sessions can be safely reset in the middle of a test run
		run: function () {
			var self = this;
			var reporterManager = this.reporterManager;
			var config = this.config;
			var remote = this.remote;
			var sessionId = remote.session.sessionId;

			var handle = this.proxy.subscribeToSession(sessionId, receiveEvent);
			var dfd = new Promise.Deferred(function (reason) {
				handle.remove();
				return remote.setHeartbeatInterval(0).then(function () {
					throw reason;
				});
			});

			function receiveEvent(name) {
				var args = arguments;
				function forward() {
					return reporterManager.emit.apply(reporterManager, args);
				}

				var suite;
				switch (name) {
					case 'suiteStart':
						suite = arguments[1];
						// The suite sent by the server is the root suite for the client-side unit tests; add its tests
						// to the runner-side client suite
						if (!suite.hasParent) {
							suite.tests.forEach(function (test) {
								self.tests.push(test);
							});
							return reporterManager.emit('suiteStart', self);
						}
						return forward();

					case 'suiteEnd':
						suite = arguments[1];
						// The suite sent by the server is the root suite for the client-side unit tests; update the
						// existing test objects with the new ones from the server that reflect all the test results
						if (!suite.hasParent) {
							suite.tests.forEach(function (test, index) {
								self.tests[index] = test;
							});
						}
						else {
							return forward();
						}
						break;

					case 'suiteError':
						suite = arguments[1];
						if (!suite.hasParent) {
							handle.remove();
							return handleError(arguments[2]);
						}
						return forward();

					case 'runStart':
						break;

					case 'runEnd':
						handle.remove();
						// get about:blank to always collect code coverage data from the page in case it is
						// navigated away later by some other process; this happens during self-testing when
						// the new Leadfoot library takes over
						remote.setHeartbeatInterval(0).get('about:blank').then(function () {
							return reporterManager.emit('suiteEnd', self);
						}).then(function () {
							dfd.resolve();
						}, handleError);
						break;

					case 'fatalError':
						handle.remove();
						var error = arguments[1];
						return handleError(error);

					default:
						return forward();
				}
			}

			function handleError(error) {
				self.error = error;
				return self.reporterManager.emit('suiteError', self, error).then(function () {
					dfd.reject(error);
				});
			}

			var proxyBasePath = urlUtil.parse(config.proxyUrl).pathname;

			var clientReporter = this.config.runnerClientReporter;
			if (typeof clientReporter === 'object') {
				// Need to mixin the properties of `clientReporter` to a new object before stringify because
				// stringify only serialises an object’s own properties
				clientReporter = JSON.stringify(lang.mixin({}, clientReporter));
			}
			else {
				clientReporter = 'WebDriver';
			}

			var options = lang.mixin({}, this.args, {
				// the proxy always serves the baseUrl from the loader configuration as the root of the proxy,
				// so ensure that baseUrl is always set to that root on the client
				basePath: proxyBasePath,
				initialBaseUrl: proxyBasePath + pathUtil.relative(config.basePath, process.cwd()),
				reporters: clientReporter,
				rootSuiteName: self.id,
				sessionId: sessionId
			});

			// Intern runs unit tests on the remote Selenium server by navigating to the client runner HTML page. No
			// real commands are issued after the call to remote.get() below until all unit tests are complete, so
			// we need to make sure that we periodically send no-ops through the channel to ensure the remote server
			// does not treat the session as having timed out
			var timeout = config.capabilities['idle-timeout'];
			if (timeout >= 1 && timeout < Infinity) {
				remote.setHeartbeatInterval((timeout - 1) * 1000);
			}

			remote
				.get(config.proxyUrl + '__intern/client.html?' + ioQuery.objectToQuery(options))
				.catch(function (error) {
					handle.remove();
					remote.setHeartbeatInterval(0).then(function () {
						handleError(error);
					});
				});

			return dfd.promise;
		}
	});

	return ClientSuite;
});
