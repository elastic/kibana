define([
	'require',
	'dojo/lang',
	'dojo/Promise',
	'dojo/node!http',
	'dojo/node!path',
	'dojo/node!fs',
	'dojo/aspect',
	'./util'
], function (require, lang, Promise, http, path, fs, aspect, util) {
	/* jshint node:true */

	function Proxy(config) {
		this.contentTypes = {
			'': 'application/octet-stream',
			'.css': 'text/css',
			'.gif': 'image/gif',
			'.html': 'text/html',
			'.jpg': 'image/jpeg',
			'.js': 'text/javascript',
			'.json': 'application/json',
			'.png': 'image/png'
		};

		this.config = config;
	}

	Proxy.prototype = {
		constructor: Proxy,

		_codeCache: null,
		_sessions: null,

		_getSession: function (sessionId) {
			var session = this._sessions[sessionId];
			if (!session) {
				session = this._sessions[sessionId] = { lastSequence: -1, queue: {}, listeners: [] };
			}

			return session;
		},

		_handler: function (request, response) {
			if (request.method === 'GET') {
				if (/\.js(?:$|\?)/.test(request.url)) {
					this._handleFile(request, response, this.config.instrument);
				}
				else {
					this._handleFile(request, response);
				}
			}
			else if (request.method === 'POST') {
				request.setEncoding('utf8');

				var data = '';
				request.on('data', function (chunk) {
					data += chunk;
				});

				var self = this;
				request.on('end', function () {
					var message = JSON.parse(data);
					var runnerReporterPromise = self._publishInSequence(message);

					var shouldWait = util.getShouldWait(self.waitForRunner, message);

					if (shouldWait) {
						runnerReporterPromise.then(function () {
							response.statusCode = 204;
							response.end();
						}, function () {
							response.statusCode = 500;
							response.end();
						});
					}
					else {
						response.statusCode = 204;
						response.end();
					}
				});
			}
			else {
				response.statusCode = 501;
				response.end();
			}
		},

		_handleFile: function (request, response, instrument) {
			function send(contentType, data) {
				response.writeHead(200, {
					'Content-Type': contentType,
					'Content-Length': Buffer.byteLength(data)
				});
				response.end(data);
			}

			var file = /^\/+([^?]*)/.exec(request.url)[1];
			var wholePath;
			var self = this;

			if (/^__intern\//.test(file)) {
				wholePath = path.join(require.toUrl('intern/'), file.replace(/^__intern\//, ''));
				instrument = false;
			}
			else {
				wholePath = path.join(this.config.basePath, file);
			}

			wholePath = util.normalizePath(wholePath);

			if (wholePath.charAt(wholePath.length - 1) === '/') {
				wholePath += 'index.html';
			}

			// if the string passed to `excludeInstrumentation` changes here, it must also change in
			// `lib/executors/Executor.js`
			if (
				this.config.excludeInstrumentation === true ||
				(
					this.config.excludeInstrumentation &&
					this.config.excludeInstrumentation.test(file)
				)
			) {
				instrument = false;
			}

			var contentType = this.contentTypes[path.extname(wholePath)] || this.contentTypes[''];
			if (instrument) {
				if (self._codeCache[wholePath]) {
					send(contentType, self._codeCache[wholePath]);
				}
				else {
					fs.readFile(wholePath, 'utf8', function (error, data) {
						// The proxy server was stopped in the middle of the file read
						if (!self.server) {
							return;
						}

						if (error) {
							self._send404(response);
							return;
						}

						// providing `wholePath` to the instrumenter instead of a partial filename is necessary because
						// lcov.info requires full path names as per the lcov spec
						data = self._codeCache[wholePath] = util.instrument(
							data.toString('utf-8'),
							wholePath,
							self.config.coverageVariable
						);
						send(contentType, data);
					});
				}
			}
			else {
				fs.stat(wholePath, function (error, status) {
					// The proxy server was stopped in the middle of the file stat
					if (!self.server) {
						return;
					}

					if (error) {
						self._send404(response);
						return;
					}

					response.writeHead(200, {
						'Content-Type': contentType,
						'Content-Length': status.size
					});

					fs.createReadStream(wholePath).pipe(response);
				});
			}
		},

		_publishInSequence: function (message) {
			var session = this._getSession(message.sessionId);

			if (message.sequence <= session.lastSequence) {
				throw new Error('Repeated sequence for session ' + message.sessionId + ': ' + session.lastSequence +
					' last ' + message.sequence + ' cur');
			}

			message.resolver = new Promise.Deferred(function (reason) {
				message.cancelled = true;
				throw reason;
			});

			if (message.sequence > session.lastSequence + 1) {
				session.queue[message.sequence] = message;
				return message.resolver.promise;
			}

			var triggerMessage = message;

			do {
				session.lastSequence = message.sequence;
				delete session.queue[session.lastSequence];

				if (!message.cancelled) {
					message.resolver.resolve(Promise.all(session.listeners.map(function (listener) {
						return listener.apply(null, message.payload);
					})));
				}
			}
			while ((message = session.queue[message.sequence + 1]));

			return triggerMessage.resolver.promise;
		},

		_send404: function (response) {
			response.writeHead(404, {
				'Content-Type': 'text/html;charset=utf-8'
			});
			response.end('<!DOCTYPE html><title>404 Not Found</title><h1>404 Not Found</h1><!-- ' +
				new Array(512).join('.') + ' -->');
		},

		start: function () {
			return new Promise(function (resolve) {
				var server = this.server = http.createServer(lang.bind(this, '_handler'));
				this._sessions = {};
				this._codeCache = {};

				var sockets = [];

				// If sockets are not manually destroyed then Node.js will keep itself running until they all expire
				aspect.after(server, 'close', function () {
					var socket;
					while ((socket = sockets.pop())) {
						socket.destroy();
					}
				});

				server.on('connection', function (socket) {
					sockets.push(socket);

					// Disabling Nagle improves server performance on low-latency connections, which are more common
					// during testing than high-latency connections
					socket.setNoDelay(true);

					socket.on('close', function () {
						var index = sockets.indexOf(socket);
						index !== -1 && sockets.splice(index, 1);
					});
				});

				server.listen(this.config.port, resolve);
			}.bind(this));
		},

		stop: function () {
			return new Promise(function (resolve) {
				if (this.server) {
					this.server.close(resolve);
				}
				else {
					resolve();
				}

				this.server = this._codeCache = null;
			}.bind(this));
		},

		subscribeToSession: function (sessionId, listener) {
			var listeners = this._getSession(sessionId).listeners;
			listeners.push(listener);
			return {
				remove: function () {
					this.remove = function () {};
					lang.pullFromArray(listeners, listener);
				}
			};
		}
	};

	return Proxy;
});
