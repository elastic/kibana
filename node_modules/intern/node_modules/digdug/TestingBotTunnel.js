/**
 * @module digdug/TestingBotTunnel
 */

var fs = require('fs');
var ioQuery = require('dojo/io-query');
var os = require('os');
var pathUtil = require('path');
var request = require('dojo/request');
var Tunnel = require('./Tunnel');
var urlUtil = require('url');
var util = require('./util');

/**
 * A TestingBot tunnel.
 *
 * @constructor module:digdug/TestingBotTunnel
 * @extends module:digdug/Tunnel
 */
function TestingBotTunnel() {
	this.apiKey = process.env.TESTINGBOT_KEY;
	this.apiSecret = process.env.TESTINGBOT_SECRET;
	this.fastFailDomains = [];
	Tunnel.apply(this, arguments);
}

var _super = Tunnel.prototype;
TestingBotTunnel.prototype = util.mixin(Object.create(_super), /** @lends module:digdug/TestingBotTunnel# */ {
	constructor: TestingBotTunnel,

	/**
	 * The TestingBot API key.
	 *
	 * @type {string}
	 * @default the value of the TESTINGBOT_API_KEY environment variable
	 */
	apiKey: null,

	/**
	 * The TestingBot API secret.
	 *
	 * @type {string}
	 * @default the value of the TESTINGBOT_API_SECRET environment variable
	 */
	apiSecret: null,

	directory: pathUtil.join(__dirname, 'testingbot'),

	executable: 'java',

	/**
	 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
	 * attempts to make a connection to them.
	 *
	 * @type {string[]}
	 */
	fastFailDomains: null,

	/**
	 * A filename where additional logs from the tunnel should be output.
	 *
	 * @type {string}
	 */
	logFile: null,

	port: 4445,

	url: 'http://testingbot.com/downloads/testingbot-tunnel.zip',

	/**
	 * Whether or not to use rabbIT compression for the tunnel connection.
	 *
	 * @type {boolean}
	 * @default
	 */
	useCompression: false,

	/**
	 * Whether or not to use the default local Jetty proxy for the tunnel.
	 *
	 * @type {boolean}
	 * @default
	 */
	useJettyProxy: true,

	/**
	 * Whether or not to use the default remote Squid proxy for the VM.
	 *
	 * @type {boolean}
	 * @default
	 */
	useSquidProxy: true,

	/**
	 * Whether or not to re-encrypt data encrypted by self-signed certificates.
	 *
	 * @type {boolean}
	 * @default
	 */
	useSsl: false,

	get auth() {
		return this.apiKey + ':' + this.apiSecret;
	},

	get isDownloaded() {
		return fs.existsSync(pathUtil.join(this.directory, 'testingbot-tunnel/testingbot-tunnel.jar'));
	},

	_makeArgs: function (readyFile) {
		var args = [
			'-jar', 'testingbot-tunnel/testingbot-tunnel.jar',
			this.apiKey,
			this.apiSecret,
			'-P', this.port,
			'-f', readyFile
		];

		this.fastFailDomains.length && args.push('-F', this.fastFailDomains.join(','));
		this.logFile && args.push('-l', this.logFile);
		this.useJettyProxy || args.push('-x');
		this.useSquidProxy || args.push('-q');
		this.useCompression && args.push('-b');
		this.useSsl && args.push('-s');
		this.verbose && args.push('-d');

		if (this.proxy) {
			var proxy = urlUtil.parse(this.proxy);

			proxy.hostname && args.unshift('-Dhttp.proxyHost=', proxy.hostname);
			proxy.port && args.unshift('-Dhttp.proxyPort=', proxy.port);
		}

		return args;
	},

	sendJobState: function (jobId, data) {
		var payload = {};

		data.success != null && (payload['test[success]'] = data.success ? 1 : 0);
		data.status && (payload['test[status_message]'] = data.status);
		data.name && (payload['test[name]'] = data.name);
		data.extra && (payload['test[extra]'] = JSON.stringify(data.extra));
		data.tags && data.tags.length && (payload.groups = data.tags.join(','));

		payload = ioQuery.objectToQuery(payload);

		return request.put('https://api.testingbot.com/v1/tests/' + jobId, {
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
				else if (!data.success) {
					throw new Error('Job data failed to save.');
				}
				else if (response.statusCode !== 200) {
					throw new Error('Server reported ' + response.statusCode + ' with: ' + response.data);
				}
			}
			else {
				throw new Error('Server reported ' + response.statusCode + ' with no other data.');
			}
		});
	},

	_start: function () {
		var readyFile = pathUtil.join(os.tmpdir(), 'testingbot-' + Date.now());
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
			dfd.resolve();
		});

		var self = this;
		var lastMessage;
		this._handles.push(
			util.on(childProcess.stderr, 'data', function (data) {
				data.split('\n').forEach(function (message) {
					if (message.indexOf('INFO: ') === 0) {
						message = message.slice('INFO: '.length);
						// the tunnel produces a lot of repeating messages during setup when the status is pending;
						// deduplicate them for sanity
						if (
							message !== lastMessage &&
							message.indexOf('>> [') === -1 &&
							message.indexOf('<< [') === -1
						) {
							self.emit('status', message);
							lastMessage = message;
						}
					}
				});
			})
		);

		return child;
	}
});

module.exports = TestingBotTunnel;
