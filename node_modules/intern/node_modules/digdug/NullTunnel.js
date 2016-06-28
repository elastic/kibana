/**
 * @module digdug/NullTunnel
 */

var Promise = require('dojo/Promise');
var Tunnel = require('./Tunnel');
var util = require('./util');

function success() {
	return Promise.resolve();
}

/**
 * A no-op tunnel.
 *
 * @constructor module:digdug/NullTunnel
 * @extends module:digdug/Tunnel
 */
function NullTunnel() {
	Tunnel.apply(this, arguments);
}

var _super = Tunnel.prototype;
NullTunnel.prototype = util.mixin(Object.create(_super), /** @lends module:digdug/NullTunnel */ {
	auth: '',
	isDownloaded: true,
	download: success,
	start: function () {
		this.isRunning = true;
		return success();
	},
	stop: function () {
		this.isRunning = false;
		return success();
	},
	sendJobState: success
});

module.exports = NullTunnel;
