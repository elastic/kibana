'use strict';
var path = require('path');
var osName = require('os-name');
var fork = require('child_process').fork;
var Configstore = require('configstore');
var chalk = require('chalk');
var assign = require('object-assign');
var debounce = require('lodash.debounce');
var inquirer = require('inquirer');
var providers = require('./providers');

function Insight (options) {
	options = options || {};

	if (!options.trackingCode || !options.packageName) {
		throw new Error('Must provide trackingCode and packageName');
	}

	this.trackingCode = options.trackingCode;
	this.trackingProvider = options.trackingProvider || 'google';
	this.packageName = options.packageName;
	this.packageVersion = options.packageVersion || 'undefined';
	this.os = osName();
	this.nodeVersion = process.version;
	this.appVersion = options.packageVersion;
	this.config = options.config || new Configstore('insight-' + this.packageName, {
		clientId: options.clientId || Math.floor(Date.now() * Math.random())
	});
	this._queue = {};
}

Object.defineProperty(Insight.prototype, 'optOut', {
	get: function () {
		return this.config.get('optOut');
	},
	set: function (val) {
		this.config.set('optOut', val);
	}
});

Object.defineProperty(Insight.prototype, 'clientId', {
	get: function () {
		return this.config.get('clientId');
	},
	set: function (val) {
		this.config.set('clientId', val);
	}
});

// debounce in case of rapid .track() invocations
Insight.prototype._save = debounce(function () {
	var cp = fork(path.join(__dirname, 'push.js'));
	cp.send(this._getPayload());
	cp.unref();
	cp.disconnect();

	this._queue = {};
}, 100);

Insight.prototype._getPayload = function () {
	return {
		queue: assign({}, this._queue),
		packageName: this.packageName,
		packageVersion: this.packageVersion,
		trackingCode: this.trackingCode,
		trackingProvider: this.trackingProvider
	};
};

Insight.prototype._getRequestObj = function () {
	return providers[this.trackingProvider].apply(this, arguments);
};

Insight.prototype.track = function () {
	if (this.optOut) {
		return;
	}

	var path = '/' + [].map.call(arguments, function (el) {
		return String(el).trim().replace(/ /, '-');
	}).join('/');

	// timestamp isn't unique enough since it can end up with duplicate entries
	this._queue[Date.now() + ' ' + path] = path;
	this._save();
};

Insight.prototype.askPermission = function (msg, cb) {
	var defaultMsg = 'May ' + chalk.cyan(this.packageName) + ' anonymously report usage statistics to improve the tool over time?';

	cb = cb || function () {};

	if (!process.stdout.isTTY) {
		setImmediate(cb, null, false);
		return;
	}

	inquirer.prompt({
		type: 'confirm',
		name: 'optIn',
		message: msg || defaultMsg,
		default: true
	}, function (result) {
		this.optOut = !result.optIn;
		cb(null, result.optIn);
	}.bind(this));
};

module.exports = Insight;
