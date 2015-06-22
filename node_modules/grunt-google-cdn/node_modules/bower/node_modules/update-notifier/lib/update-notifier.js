'use strict';
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;
var Configstore = require('configstore');
var chalk = require('chalk');
var semver = require('semver');

var proxyServer = process.env.HTTPS_PROXY
	|| process.env.https_proxy
	|| process.env.HTTP_PROXY
	|| process.env.http_proxy;

function UpdateNotifier(options) {
	this.options = options = options || {};

	if (!options.packageName || !options.packageVersion) {
		this.packageFile = require(path.resolve(path.dirname(module.parent.filename), options.packagePath || 'package'));
	}

	if (options.callback) {
		this.hasCallback = true;
	}

	this.packageName = options.packageName || this.packageFile.name;
	this.packageVersion = options.packageVersion || this.packageFile.version;
	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : 1000 * 60 * 60 * 24; // 1 day
	this.updateCheckTimeout = typeof options.updateCheckTimeout === 'number' ? options.updateCheckTimeout : 20000;                  // 20 secs
	this.registryUrl = options.registryUrl || 'http://registry.npmjs.org/%s';
	this.callback = options.callback || function () {};

	if (!this.hasCallback) {
		this.config = new Configstore('update-notifier-' + this.packageName, {
			optOut: false
		});
	}
}

UpdateNotifier.prototype.check = function () {
	if (this.hasCallback) {
		return this.checkNpm(this.callback);
	}

	var cp;

	if (this.config.get('optOut')) {
		return;
	}

	this.update = this.config.get('update');
	if (this.update) {
		this.config.del('update');
	}

	// Only check for updates on a set interval
	if (new Date() - this.config.get('lastUpdateCheck') < this.updateCheckInterval) {
		return;
	}

	this.config.set('lastUpdateCheck', +new Date());
	this.config.del('update');

	// Set some needed options before forking
	// This is needed because we can't infer the packagePath in the fork
	this.options.packageName = this.packageName;
	this.options.packageVersion = this.packageVersion;

	// Fork, passing the options as an environment property
	cp = fork(__dirname + '/check.js', [JSON.stringify(this.options)]);
	cp.unref();
	cp.disconnect();
};

UpdateNotifier.prototype.checkNpm = function (cb) {
	var request = require('request');
	var url = util.format(this.registryUrl, this.packageName);

	request({url: url, json: true, timeout: this.updateCheckTimeout, proxy: proxyServer}, function (error, response, body) {
		var currentVersion, latestVersion;

		if (error) {
			return cb(error);
		}

		if (body.error) {
			return cb(new Error('Package not found'));
		}

		currentVersion = this.packageVersion;

		if (typeof body['dist-tags'] !== 'object' || typeof body['dist-tags'].latest !== 'string') {
			return cb(new Error(util.format('Package "%s" "dist-tag" property not found in body of HTTP response from npm', this.packageName)));
		}

		latestVersion = body['dist-tags'].latest;

		cb(null, {
			latest: latestVersion,
			current: currentVersion,
			type: this.updateType(currentVersion, latestVersion),
			date: body.time[latestVersion],
			name: this.packageName
		});
	}.bind(this));
};

UpdateNotifier.prototype.notify = function (customMessage) {
	var message =
	        '\n\n' +
		chalk.blue('-----------------------------------------') +
		'\nUpdate available: ' + chalk.green.bold(this.update.latest) +
		chalk.gray(' (current: ' + this.update.current + ')') +
		'\nRun ' + chalk.magenta('npm update -g ' + this.packageName) +
		' to update\n' +
		chalk.blue('-----------------------------------------');
	if (customMessage) {
		process.on('exit', function () {
			console.log(typeof customMessage === 'string' ? customMessage : message);
		});
	} else {
		console.log(message);
	}
};

UpdateNotifier.prototype.updateType = function (currentVersion, latestVersion) {
	// Check if the current version is greater or equal than the latest npm version
	// Invalid versions should be ignored
	if (!semver.valid(currentVersion) || semver.gte(currentVersion, latestVersion)) {
		return 'latest';
	}

	// Otherwise there's an update
	currentVersion = currentVersion.split('.');
	latestVersion = latestVersion.split('.');

	if (latestVersion[0] > currentVersion[0]) {
		return 'major';
	} else if (latestVersion[1] > currentVersion[1]) {
		return 'minor';
	} else if (latestVersion[2] > currentVersion[2]) {
		return 'patch';
	}
};

module.exports = function (options) {
	var updateNotifier = new UpdateNotifier(options);

	updateNotifier.check();

	return updateNotifier;
};

module.exports.UpdateNotifier = UpdateNotifier;
