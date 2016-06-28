/* jshint node:true */
define([
	'intern',
	'intern/lib/util',
	'dojo/node!fs',
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/json',
	'dojo/node!istanbul/lib/report/html',
	'dojo/node!istanbul/lib/report/text',
	'dojo/node!istanbul/index'
], function (intern, util, fs, Collector, JsonReporter, LcovHtmlReporter, TextReporter) {
	function Combined(config) {
		config = config || {};

		this._collector = new Collector();
		this._hasDot = false;
		this.output = config.output;

		if (intern.mode === 'client') {
			this._reporters = [
				new JsonReporter()
			];
		}
		else {
			this._reporters = [
				new TextReporter({
					watermarks: config.watermarks
				}),
				new LcovHtmlReporter({
					dir: config.directory,
					watermarks: config.watermarks
				})
			];
		}
	}

	Combined.prototype = {
		constructor: Combined,

		coverage: function (sessionId, coverage) {
			this._collector.add(coverage);
		},

		deprecated: function (deprecated, replacement, extra) {
			this.output.write('⚠ ' + deprecated + ' is deprecated.');
			if (replacement) {
				this.output.write(' Use ' + replacement + ' instead.');
			}
			if (extra) {
				this.output.write(extra);
			}
			this.output.write('\n');
		},

		fatalError: function (error) {
			this._writeLine();
			this.output.write(util.getErrorMessage(error) + '\n');
		},

		run: function () {
			this.output.write('Running ' + intern.mode + ' tests…\n');
		},

		runEnd: function () {
			var collector = this._collector;

			if (intern.mode === 'runner' && fs.existsSync('coverage-final.json')) {
				collector.add(JSON.parse(fs.readFileSync('coverage-final.json')));
			}

			this._writeLine();
			this._reporters.forEach(function (reporter) {
				reporter.writeReport(collector, true);
			});
		},

		sessionStart: function (remote) {
			this._writeLine();
			this.output.write('Testing ' + remote.environmentType + '\n');
		},

		suiteError: function (suite, error) {
			this._writeLine();
			this.output.write(util.getErrorMessage(error) + '\n');
		},

		tunnelDownloadProgress: function (tunnel, progress) {
			var total = progress.loaded / progress.total;

			if (isNaN(total)) {
				return;
			}

			this.output.write('\rDownload ' + (total * 100).toFixed(2) + '% complete');

			if (total === 1) {
				this.output.write('\n');
			}
		},

		tunnelStart: function () {
			this._writeLine();
			this.output.write('\r\x1b[KTunnel started\n');
		},

		tunnelStatus: function (tunnel, status) {
			this.output.write('\r\x1b[KTunnel: ' + status);
		},

		testFail: function (test) {
			this._writeLine();
			this.output.write('FAIL: ' + test.id + '\n');
			this.output.write(util.getErrorMessage(test.error) + '\n');
		},

		testPass: function () {
			if (intern.mode === 'runner') {
				this.output.write('.');
				this._hasDot = true;
			}
		},

		_writeLine: function () {
			if (this._hasDot) {
				this.output.write('\n');
				this._hasDot = false;
			}
		}
	};

	return Combined;
});
