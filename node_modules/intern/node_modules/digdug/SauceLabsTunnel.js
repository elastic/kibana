/**
 * @module digdug/SauceLabsTunnel
 */

var fs = require('fs');
var os = require('os');
var pathUtil = require('path');
var Promise = require('dojo/Promise');
var request = require('dojo/request');
var Tunnel = require('./Tunnel');
var urlUtil = require('url');
var util = require('./util');

var SC_VERSION = '4.3';

/**
 * A Sauce Labs tunnel. This tunnel uses Sauce Connect 4 on platforms where it is supported, and Sauce Connect 3
 * on all other platforms.
 *
 * @constructor module:digdug/SauceLabsTunnel
 * @extends module:digdug/Tunnel
 */
function SauceLabsTunnel() {
	this.accessKey = process.env.SAUCE_ACCESS_KEY;
	this.directDomains = [];
	this.tunnelDomains = [];
	this.domainAuthentication = [];
	this.fastFailDomains = [];
	this.skipSslDomains = [];
	this.username = process.env.SAUCE_USERNAME;
	Tunnel.apply(this, arguments);
}

var _super = Tunnel.prototype;
SauceLabsTunnel.prototype = util.mixin(Object.create(_super), /** @lends module:digdug/SauceLabsTunnel# */ {
	constructor: SauceLabsTunnel,

	/**
	 * The Sauce Labs access key.
	 *
	 * @type {string}
	 * @default the value of the SAUCE_ACCESS_KEY environment variable
	 */
	accessKey: null,

	/**
	 * A list of domains that should not be proxied by the tunnel on the remote VM.
	 *
	 * @type {string[]}
	 */
	directDomains: null,

	/**
	 * A list of domains that will be proxied by the tunnel on the remote VM.
	 *
	 * @type {string[]}
	 */
	tunnelDomains: null,

	directory: pathUtil.join(__dirname, 'saucelabs'),

	/**
	 * A list of URLs that require additional HTTP authentication. Only the hostname, port, and auth are used.
	 * This property is only supported by Sauce Connect 4 tunnels.
	 *
	 * @type {string[]}
	 */
	domainAuthentication: null,

	/**
	 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
	 * attempts to make a connection to them.
	 *
	 * @type {string[]}
	 */
	fastFailDomains: null,

	/**
	 * Allows the tunnel to also be used by sub-accounts of the user that started the tunnel.
	 *
	 * @type {boolean}
	 * @default
	 */
	isSharedTunnel: false,

	/**
	 * A filename where additional logs from the tunnel should be output.
	 *
	 * @type {string}
	 */
	logFile: null,

	/**
	 * A filename where Sauce Connect stores its process information.
	 *
	 * @type {string}
	 */
	pidFile: null,

	/**
	 * Specifies the maximum log filesize before rotation, in bytes.
	 * This property is only supported by Sauce Connect 3 tunnels.
	 *
	 * @type {number}
	 */
	logFileSize: null,

	/**
	 * Log statistics about HTTP traffic every `logTrafficStats` milliseconds.
	 * This property is only supported by Sauce Connect 4 tunnels.
	 *
	 * @type {number}
	 * @default
	 */
	logTrafficStats: 0,

	/**
	 * An alternative URL for the Sauce REST API.
	 * This property is only supported by Sauce Connect 3 tunnels.
	 *
	 * @type {string}
	 */
	restUrl: null,

	/**
	 * A list of domains that should not have their SSL connections re-encrypted when going through the tunnel.
	 *
	 * @type {string[]}
	 */
	skipSslDomains: null,

	/**
	 * An additional set of options to use with the Squid proxy for the remote VM.
	 * This property is only supported by Sauce Connect 3 tunnels.
	 *
	 * @type {string}
	 */
	squidOptions: null,

	/**
	 * Whether or not to use the proxy defined at {@link module:digdug/Tunnel#proxy} for the tunnel connection
	 * itself.
	 *
	 * @type {boolean}
	 * @default
	 */
	useProxyForTunnel: false,

	/**
	 * The Sauce Labs username.
	 *
	 * @type {string}
	 * @default the value of the SAUCE_USERNAME environment variable
	 */
	username: null,

	/**
	 * Overrides the version of the VM created on Sauce Labs.
	 * This property is only supported by Sauce Connect 3 tunnels.
	 *
	 * @type {string}
	 */
	vmVersion: null,

	get auth() {
		return this.username + ':' + this.accessKey;
	},

	get executable() {
		var platform = this.platform === 'darwin' ? 'osx' : this.platform;
		var architecture = this.architecture;

		if (platform === 'osx' || platform === 'win32' || (platform === 'linux' && architecture === 'x64')) {
			return './sc-' + SC_VERSION + '-' + platform + '/bin/sc' + (platform === 'win32' ? '.exe' : '');
		}
		else {
			return 'java';
		}
	},

	get extraCapabilities() {
		var capabilities = {};

		if (this.tunnelId) {
			capabilities['tunnel-identifier'] = this.tunnelId;
		}

		return capabilities;
	},

	get isDownloaded() {
		return fs.existsSync(this.executable === 'java' ?
			pathUtil.join(this.directory, 'Sauce-Connect.jar') :
			pathUtil.join(this.directory, this.executable)
		);
	},

	get url() {
		var platform = this.platform === 'darwin' ? 'osx' : this.platform;
		var architecture = this.architecture;
		var url = 'https://saucelabs.com/downloads/sc-' + SC_VERSION + '-';

		if (platform === 'osx' || platform === 'win32') {
			url += platform + '.zip';
		}
		else if (platform === 'linux' && architecture === 'x64') {
			url += platform + '.tar.gz';
		}
		// Sauce Connect 3 uses Java so should be able to run on other platforms that Sauce Connect 4 does not support
		else {
			url = 'https://saucelabs.com/downloads/Sauce-Connect-3.1-r32.zip';
		}

		return url;
	},

	download: function () {
		var self = this;
		var executable = this.executable;
		return _super.download.apply(this, arguments).then(function () {
			if (self.executable !== 'java') {
				fs.chmodSync(pathUtil.join(self.directory, executable), parseInt('0755', 8));
			}
		});
	},

	_makeNativeArgs: function (proxy) {
		var args = [
			'-u', this.username,
			'-k', this.accessKey
		];

		if (proxy) {
			if (proxy.host) {
				args.push('-p', proxy.host);
			}

			if (proxy.auth) {
				args.push('-w', proxy.auth);
			}
			else if (proxy.username) {
				args.push('-w', proxy.username + ':' + proxy.password);
			}
		}

		if (this.domainAuthentication.length) {
			this.domainAuthentication.forEach(function (domain) {
				domain = urlUtil.parse(domain);
				args.push('-a', domain.hostname + ':' + domain.port + ':' + domain.auth);
			});
		}

		this.logTrafficStats && args.push('-z', Math.floor(this.logTrafficStats / 1000));
		this.verbose && args.push('-v');

		return args;
	},

	_makeJavaArgs: function (proxy) {
		var args = [
			'-jar', 'Sauce-Connect.jar',
			this.username,
			this.accessKey
		];

		this.logFileSize && args.push('-g', this.logFileSize);
		this.squidOptions && args.push('-S', this.squidOptions);
		this.vmVersion && args.push('-V', this.vmVersion);
		this.restUrl && args.push('-x', this.restUrl);
		this.verbose && args.push('-d');

		if (proxy) {
			proxy.hostname && args.push('-p', proxy.hostname + (proxy.port ? ':' + proxy.port : ''));

			if (proxy.auth) {
				var auth = proxy.auth.split(':');
				args.push('-u', auth[0], '-X', auth[1]);
			}
			else {
				proxy.username && args.push('-u', proxy.username);
				proxy.password && args.push('-X', proxy.password);
			}
		}

		return args;
	},

	_makeArgs: function (readyFile) {
		var proxy = this.proxy ? urlUtil.parse(this.proxy) : undefined;
		var args = this.executable === 'java' ? this._makeJavaArgs(proxy) : this._makeNativeArgs(proxy);

		args.push(
			'-P', this.port,
			'-f', readyFile
		);

		this.directDomains.length && args.push('-D', this.directDomains.join(','));
		this.tunnelDomains.length && args.push('-t', this.tunnelDomains.join(','));
		this.fastFailDomains.length && args.push('-F', this.fastFailDomains.join(','));
		this.isSharedTunnel && args.push('-s');
		this.logFile && args.push('-l', this.logFile);
		this.pidFile && args.push('--pidfile', this.pidFile);
		this.skipSslDomains.length && args.push('-B', this.skipSslDomains.join(','));
		this.tunnelId && args.push('-i', this.tunnelId);
		this.useProxyForTunnel && args.push('-T');

		return args;
	},

	sendJobState: function (jobId, data) {
		var url = urlUtil.parse(this.restUrl || 'https://saucelabs.com/rest/v1/');
		url.auth = this.username + ':' + this.accessKey;
		url.pathname += this.username + '/jobs/' + jobId;

		var payload = JSON.stringify({
			build: data.buildId,
			'custom-data': data.extra,
			name: data.name,
			passed: data.success,
			public: data.visibility,
			tags: data.tags
		});

		return request.put(urlUtil.format(url), {
			data: payload,
			handleAs: 'text',
			headers: {
				'Content-Length': Buffer.byteLength(payload, 'utf8'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			password: this.apiSecret,
			user: this.apiKey,
			proxy: this.proxy
		}).then(function (response) {
			if (response.data) {
				var data = JSON.parse(response.data);

				if (data.error) {
					throw new Error(data.error);
				}

				if (response.statusCode !== 200) {
					throw new Error('Server reported ' + response.statusCode + ' with: ' + response.data);
				}
			}
			else {
				throw new Error('Server reported ' + response.statusCode + ' with no other data.');
			}
		});
	},

	_start: function () {
		var self = this;
		function readStatus(message) {
			if (
				message &&
				message.indexOf('Please wait for') === -1 &&
				message.indexOf('Sauce Connect is up') === -1 &&
				message.indexOf('Sauce Connect') !== 0 &&
				message.indexOf('Using CA certificate bundle') === -1 &&
				// Sauce Connect 3
				message.indexOf('You may start your tests') === -1
			) {
				self.emit('status', message);
			}
		}

		function readStartupMessage(message) {
			function reject(message) {
				if (dfd.promise.state === Promise.State.PENDING) {
					dfd.reject(new Error(message));
				}
				return true;
			}

			// These messages contain structured data we can try to consume
			if (message.indexOf('Error: response: ') === 0) {
				try {
					var error = /(\{[\s\S]*\})/.exec(message);
					if (error) {
						error = JSON.parse(error[1]);
						return reject(error.error);
					}
				}
				catch (error) {
					// It seems parsing did not work so well; fall through to the normal error handler
				}
			}

			if (message.indexOf('Error: ') === 0) {
				// skip known warnings
				if (
					/open file limit \d+ is too low/.test(message) ||
					/Sauce Labs recommends setting it/.test(message) ||
					/HTTP response code indicated failure/.test(message)
				) {
					return;
				}
				return reject(message.slice('Error: '.length));
			}

			readStatus(message);
		}

		function readRunningMessage(message) {
			// Sauce Connect 3
			if (message.indexOf('Problem connecting to Sauce Labs REST API') > -1) {
				// It will just keep trying and trying and trying for a while, but it is a failure, so force it
				// to stop
				childProcess.kill('SIGTERM');
			}

			readStatus(message);
		}

		var readyFile = pathUtil.join(os.tmpdir(), 'saucelabs-' + Date.now());
		var child = this._makeChild(readyFile);
		var childProcess = child.process;
		var dfd = child.deferred;

		// Polling API is used because we are only watching for one file, so efficiency is not a big deal, and the
		// `fs.watch` API has extra restrictions which are best avoided
		fs.watchFile(readyFile, { persistent: false, interval: 1007 }, function (current, previous) {
			if (Number(current.mtime) === Number(previous.mtime)) {
				// readyFile hasn't been modified, so ignore the event
				return;
			}

			fs.unwatchFile(readyFile);

			// We have to watch for errors until the tunnel has started successfully at which point we only want to
			// watch for status messages to emit
			readMessage = readStatus;

			dfd.resolve();
		});

		var readMessage = readStartupMessage;

		dfd.promise.then(function () {
			readMessage = readRunningMessage();
		});

		// Sauce Connect exits with a zero status code when there is a failure, and outputs error messages to
		// stdout, like a boss. Even better, it uses the "Error:" tag for warnings.
		this._handles.push(util.on(childProcess.stdout, 'data', function (data) {
			data.split('\n').some(function (message) {
				// Get rid of the date/time prefix on each message
				var delimiter = message.indexOf(' - ');
				if (delimiter > -1) {
					message = message.slice(delimiter + 3);
				}
				return readMessage(message.trim());
			});
		}));

		return child;
	}
});

module.exports = SauceLabsTunnel;
