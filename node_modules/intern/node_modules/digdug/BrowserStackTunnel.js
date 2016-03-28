/**
 * @module digdug/BrowserStackTunnel
 */

var fs = require('fs');
var pathUtil = require('path');
var request = require('dojo/request');
var Tunnel = require('./Tunnel');
var urlUtil = require('url');
var util = require('./util');

/**
 * A BrowserStack tunnel.
 *
 * @constructor module:digdug/BrowserStackTunnel
 * @extends module:digdug/Tunnel
 */
function BrowserStackTunnel() {
	this.accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
	this.servers = [];
	this.username = process.env.BROWSERSTACK_USERNAME;
	Tunnel.apply(this, arguments);
}

var _super = Tunnel.prototype;

BrowserStackTunnel.prototype = util.mixin(Object.create(_super), /** @lends module:digdug/BrowserStackTunnel# */ {
	constructor: BrowserStackTunnel,

	/**
	 * The BrowserStack access key. This will be initialized with the value of the `BROWSERSTACK_ACCESS_KEY`
	 * environment variable.
	 *
	 * @type {string}
	 * @default the value of the BROWSERSTACK_ACCESS_KEY environment variable
	 */
	accessKey: null,

	/**
	 * Whether or not to start the tunnel with only WebDriver support. Setting this value to `false` is not
	 * supported.
	 *
	 * @type {boolean}
	 * @default
	 */
	automateOnly: true,

	directory: pathUtil.join(__dirname, 'browserstack'),

	hostname: 'hub.browserstack.com',

	/**
	 * If true, any other tunnels running on the account will be killed when the tunnel is started.
	 *
	 * @type {boolean}
	 * @default
	 */
	killOtherTunnels: false,

	/**
	 * A list of server URLs that should be proxied by the tunnel. Only the hostname, port, and protocol are used.
	 *
	 * @type {string[]}
	 */
	servers: null,

	/**
	 * Skip verification that the proxied servers are online and responding at the time the tunnel starts.
	 *
	 * @type {boolean}
	 * @default
	 */
	skipServerValidation: true,

	/**
	 * The BrowserStack username. This will be initialized with the value of the `BROWSERSTACK_USERNAME`
	 * environment variable.
	 *
	 * @type {string}
	 * @default the value of the BROWSERSTACK_USERNAME environment variable
	 */
	username: null,

	get auth() {
		return this.username + ':' + this.accessKey;
	},

	get executable() {
		return './BrowserStackLocal' + (this.platform === 'win32' ? '.exe' : '');
	},

	get extraCapabilities() {
		var capabilities = {
			'browserstack.local': 'true'
		};

		if (this.tunnelId) {
			capabilities['browserstack.localIdentifier'] = this.tunnelId;
		}

		return capabilities;
	},

	get url() {
		var platform = this.platform;
		var architecture = this.architecture;
		var url = 'https://www.browserstack.com/browserstack-local/BrowserStackLocal-';

		if (platform === 'darwin' && architecture === 'x64') {
			url += platform + '-' + architecture;
		} else if (platform === 'win32') {
			url += platform;
		}
		else if (platform === 'linux' && (architecture === 'ia32' || architecture === 'x64')) {
			url += platform + '-' + architecture;
		}
		else {
			throw new Error(platform + ' on ' + architecture + ' is not supported');
		}

		url += '.zip';
		return url;
	},

	download: function () {
		var executable = pathUtil.join(this.directory, this.executable);
		return _super.download.apply(this, arguments).then(function () {
			fs.chmodSync(executable, parseInt('0755', 8));
		});
	},

	_makeArgs: function () {
		var args = [
			this.accessKey,
			this.servers.map(function (server) {
				server = urlUtil.parse(server);
				return [ server.hostname, server.port, server.protocol === 'https:' ? 1 : 0 ].join(',');
			})
		];

		this.automateOnly && args.push('-onlyAutomate');
		this.killOtherTunnels && args.push('-force');
		this.skipServerValidation && args.push('-skipCheck');
		this.tunnelId && args.push('-localIdentifier', this.tunnelId);
		this.verbose && args.push('-v');

		if (this.proxy) {
			var proxy = urlUtil.parse(this.proxy);

			proxy.hostname && args.push('-proxyHost', proxy.hostname);
			proxy.port && args.push('-proxyPort', proxy.port);

			if (proxy.auth) {
				var auth = proxy.auth.split(':');
				args.push('-proxyUser', auth[0], '-proxyPass', auth[1]);
			}
			else {
				proxy.username && args.push('-proxyUser', proxy.username);
				proxy.password && args.push('-proxyPass', proxy.password);
			}
		}

		return args;
	},

	sendJobState: function (jobId, data) {
		var payload = JSON.stringify({
			status: data.status || data.success ? 'completed' : 'error'
		});

		return request.put('https://www.browserstack.com/automate/sessions/' + jobId + '.json', {
			data: payload,
			handleAs: 'text',
			headers: {
				'Content-Length': Buffer.byteLength(payload, 'utf8'),
				'Content-Type': 'application/json'
			},
			password: this.accessKey,
			user: this.username,
			proxy: this.proxy
		}).then(function (response) {
			if (response.statusCode >= 200 && response.statusCode < 300) {
				return true;
			}
			else {
				throw new Error(response.data || 'Server reported ' + response.statusCode + ' with no other data.');
			}
		});
	},

	_start: function () {
		var child = this._makeChild();
		var childProcess = child.process;
		var dfd = child.deferred;
		var self = this;

		var handle = util.on(childProcess.stdout, 'data', function (data) {
			var error = /\s*\*\*\* Error: (.*)$/m.exec(data);
			if (error) {
				handle.remove();
				dfd.reject(new Error('The tunnel reported: ' + error[1]));
			}
			else if (data.indexOf('You can now access your local server(s) in our remote browser') > -1) {
				handle.remove();
				dfd.resolve();
			}
			else {
				var line = data.replace(/^\s+/, '').replace(/\s+$/, '');
				if (
					/^BrowserStackLocal v/.test(line) ||
					/^Connecting to BrowserStack/.test(line) ||
					/^Connected/.test(line)
				) {
					self.emit('status', line);
				}
			}
		});

		return child;
	}
});

module.exports = BrowserStackTunnel;
