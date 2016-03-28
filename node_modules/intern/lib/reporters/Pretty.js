/**
 * Handles presentation of runner results to the user
 */
define([
	'dojo/node!charm',
	'dojo/node!charm/lib/encode',
	'dojo/node!util',
	'dojo/lang',
	'intern/lib/util',
	'dojo/has!host-node?dojo/node!istanbul/lib/collector',
	'dojo/has!host-node?dojo/node!istanbul/lib/report/text'
], function (Charm, encode, nodeUtil, lang, internUtil, Collector, Reporter) {
	/* globals process */

	var PAD = new Array(100).join(' ');
	var SPINNER_STATES = [ '/', '-', '\\', '|' ];
	var PASS = 0;
	var SKIP = 1;
	var FAIL = 2;
	var BROWSERS = {
		chrome: 'Chr',
		firefox: 'Fx',
		opera: 'O',
		safari: 'Saf',
		'internet explorer': 'IE',
		phantomjs: 'Phan'
	};
	var ASCII_COLOR = {
		red: encode('[31m'),
		green: encode('[32m'),
		yellow: encode('[33m'),
		reset: encode('[0m')
	};

	/**
	 * Model tracking test results
	 * @param {string} environment the environment associated with the report
	 * @param {string?} sessionId the sessionId associated with the report
	 * @constructor
	 */
	function Report(environment, sessionId) {
		this.environment = environment;
		this.sessionId = sessionId;
		this.numTotal = 0;
		this.numPassed = 0;
		this.numFailed = 0;
		this.numSkipped = 0;
		this.results = [];
		this.coverage = new Collector();
	}

	Report.prototype = {
		get finished() {
			return this.results.length;
		},

		record: function (result) {
			this.results.push(result);
			switch (result) {
			case PASS:
				++this.numPassed;
				break;
			case SKIP:
				++this.numSkipped;
				break;
			case FAIL:
				++this.numFailed;
				break;
			}
		},

		getCompressedResults: function (maxWidth) {
			var total = Math.max(this.numTotal, this.results.length);
			var width = Math.min(maxWidth, total);
			var resultList = [];

			for (var i = 0; i < this.results.length; ++i) {
				var pos = Math.floor(i / total * width);
				resultList[pos] = Math.max(resultList[pos] || PASS, this.results[i]);
			}

			return resultList;
		}
	};

	function pad(width) {
		return PAD.slice(0, Math.max(width, 0));
	}

	function fit(text, width, padLeft) {
		text = String(text);
		if (text.length < width) {
			if (padLeft) {
				return pad(width - text.length) + text;
			}
			return text + pad(width - text.length);
		}
		return text.slice(0, width);
	}

	function Pretty(config) {
		config = config || {};

		this.internConfig = config.internConfig;
		this.spinnerOffset = 0;
		this.dimensions = config.dimensions || {};
		this.titleWidth = config.titleWidth || 12;
		this.maxProgressBarWidth = config.maxProgressBarWidth || 40;
		this.colorReplacement = lang.mixin({
			0: ASCII_COLOR.green + '✓',
			1: ASCII_COLOR.reset + '~',
			2: ASCII_COLOR.red + '×',
			'✓': ASCII_COLOR.green,
			'!': ASCII_COLOR.red,
			'×': ASCII_COLOR.red,
			'~': ASCII_COLOR.reset,
			'⚠': ASCII_COLOR.yellow
		}, config.colorReplacement);
		this.header = '';
		this.reporters = {};
		this.log = [];
		this.total = new Report({
			watermarks: config.watermarks
		});
		this.watermarks = config.watermarks;
		this.tunnelState = '';
		this._renderTimeout = undefined;
	}

	Pretty.prototype = {
		runStart: function () {
			this.header = this.internConfig.config;
			this.charm = this.charm || this._newCharm();

			var self = this;
			function resize() {
				self.dimensions.width = process.stdout.columns || 80;
				self.dimensions.height = process.stdout.rows || 24;
			}
			resize();
			process.stdout.on('resize', resize);

			(function rerender() {
				self.charm.erase('screen').position(0, 0);
				self._render();
				self._renderTimeout = setTimeout(rerender, 200);
			})();
		},

		runEnd: function () {
			var charm = this.charm;
			clearTimeout(this._renderTimeout);
			charm.erase('screen').position(0, 0);

			// write a full log of errors
			// Sort logs: pass < deprecated < skip < errors < fail
			var ERROR_LOG_WEIGHT = { '!': 4, '×': 3, '~': 2, '⚠': 1, '✓': 0 };
			var logs = this.log.sort(function (a, b) {
				a = ERROR_LOG_WEIGHT[a.charAt(0)] || 0;
				b = ERROR_LOG_WEIGHT[b.charAt(0)] || 0;
				return a - b;
			}).map(function (line) {
				var color = this.colorReplacement[line.charAt(0)];
				return color + line;
			}, this).join('\n');
			charm.write(logs);
			charm.write('\n\n');

			// Display the pretty results
			this._render(true);

			// Display coverage information
			charm.write('\n');
			(new Reporter({
				watermarks: this.watermarks
			})).writeReport(this.total.coverage, true);
		},

		coverage: function (sessionId, coverage) {
			var reporter = this.reporters[sessionId];
			reporter && reporter.coverage.add(coverage);
			this.total.coverage.add(coverage);
		},

		suiteStart: function (suite) {
			if (!suite.hasParent) {
				var numTests = suite.numTests;
				this.total.numTotal += numTests;

				if (suite.sessionId) {
					this._getReporter(suite).numTotal += numTests;
				}
			}
		},

		suiteError: function (suite, error) {
			var message = '! ' + error.message;
			this.log.push(message + '\n' + internUtil.getErrorMessage(error));
		},

		testSkip: function (test) {
			this._record(test.sessionId, SKIP);
			this.log.push('~ ' + test.id + ': ' + (test.skipped || 'skipped'));
		},

		testPass: function (test) {
			this._record(test.sessionId, PASS);
			this.log.push('✓ ' + test.id);
		},

		testFail: function (test) {
			var message = '× ' + test.id;
			this._record(test.sessionId, FAIL);
			this.log.push(message + '\n' + internUtil.getErrorMessage(test.error));
		},

		tunnelStart: function () {
			this.tunnelState = 'Starting';
		},

		tunnelDownloadProgress: function (tunnel, progress) {
			this.tunnelState = 'Downloading ' + (progress.received / progress.numTotal * 100).toFixed(2) + '%';
		},

		tunnelStatus: function (tunnel, status) {
			this.tunnelState = status;
		},

		runnerStart: function () {
			this.tunnelState = 'Ready';
		},

		fatalError: function (error) {
			var message = '! ' + error.message;
			this.log.push(message + '\n' + internUtil.getErrorMessage(error));
			// stop the render timeout on a fatal error so Intern can exit
			clearTimeout(this._renderTimeout);
		},

		deprecated: function (name, replacement, extra) {
			var message = '⚠ ' + name + ' is deprecated.';

			if (replacement) {
				message += ' Use ' + replacement + ' instead.';
			}

			if (extra) {
				message += ' ' + extra;
			}

			this.log.push(message);
		},

		/**
		 * Return the reporter for a given session, creating it if necessary.
		 */
		_getReporter: function (suite) {
			if (!this.reporters[suite.sessionId]) {
				this.reporters[suite.sessionId] = new Report(suite.remote && suite.remote.environmentType);
			}
			return this.reporters[suite.sessionId];
		},

		/**
		 * Create the charm instance used by this reporter.
		 */
		_newCharm: function () {
			var charm = new Charm();
			charm.pipe(process.stdout);
			return charm;
		},

		_record: function (sessionId, result) {
			var reporter = this.reporters[sessionId];
			reporter && reporter.record(result);
			this.total.record(result);
		},

		/**
		 * Render the progress bar
		 * [✔︎~✔︎×✔︎✔︎✔︎✔︎✔︎✔︎] 99/100
		 * @param report the report data to render
		 * @param width the maximum width for the entire progress bar
		 */
		_drawProgressBar: function (report, width) {
			var spinnerCharacter = SPINNER_STATES[this.spinnerOffset];
			var charm = this.charm;
			if (!report.numTotal) {
				charm.write('Pending');
				return;
			}

			var totalTextSize = String(report.numTotal).length;
			var remainingWidth = Math.max(width - 4 - (totalTextSize * 2), 1);
			var barSize = Math.min(remainingWidth, report.numTotal, this.maxProgressBarWidth);
			var results = report.getCompressedResults(barSize);

			charm.write('[' + results.map(function (value) {
				return this.colorReplacement[value];
			}, this).join(''));
			charm.display('reset').write(fit(spinnerCharacter, barSize - results.length) + '] ' +
				fit(report.finished, totalTextSize, true) + '/' + report.numTotal);
		},

		/**
		 * Render a single line
		 * TITLE:        [✔︎~✔︎×✔︎✔︎✔︎✔︎✔︎✔︎] 100/100, 2 fail, 1 skip
		 * TODO split this into two lines. The first line will display the
		 * title, OS and code coverage and the progress bar on the second
		 */
		_drawSessionReporter: function (report) {
			var charm = this.charm;
			var titleWidth = this.titleWidth;
			var leftOfBar = fit(this._abbreviateEnvironment(report.environment).slice(0, titleWidth - 2) + ': ',
				titleWidth);
			var rightOfBar = '' +
				(report.numFailed ? ', ' + report.numFailed + ' fail' : '') +
				(report.numSkipped ? ', ' + report.numSkipped + ' skip' : '');
			var barWidth = this.dimensions.width - rightOfBar.length - titleWidth;

			charm.write(leftOfBar);
			this._drawProgressBar(report, barWidth);
			charm.write(rightOfBar + '\n');
		},

		/**
		 * Abbreviate the environment information for rendering
		 * @param env the test environment
		 * @returns {string} abbreviated environment information
		 */
		_abbreviateEnvironment: function (env) {
			var browser = BROWSERS[env.browserName.toLowerCase()] || env.browserName.slice(0, 4);
			var result = [browser];

			if (env.version) {
				var version = String(env.version);
				if (version.indexOf('.') > -1) {
					version = version.slice(0, version.indexOf('.'));
				}
				result.push(version);
			}

			if (env.platform) {
				result.push(env.platform.slice(0, 3));
			}

			return result.join(' ');
		},

		_render: function (omitLogs) {
			var charm = this.charm;
			var numReporters = Object.keys(this.reporters).length;
			var logLength = this.dimensions.height - numReporters - 4 /* last line & total */ -
				(this.tunnelState ? 2 : 0) - (numReporters ? 1 : 0) - (this.header ? 1 : 0);
			this.spinnerOffset = (++this.spinnerOffset) % SPINNER_STATES.length;

			charm.display('reset');
			this.header && charm.write(this.header + '\n');
			this.tunnelState && charm.write('Tunnel: ' + this.tunnelState + '\n\n');
			this._drawTotalReporter(this.total);

			// TODO if there is not room to render all reporters only render
			// active ones or only the total with less space
			if (numReporters) {
				charm.write('\n');
				for (var key in this.reporters) {
					this._drawSessionReporter(this.reporters[key]);
				}
			}

			if (!omitLogs && logLength > 0 && this.log.length) {
				var allowed = { '×': true, '⚠': true, '!': true };
				var logs = this.log.filter(function (line) {
					return allowed[line.charAt(0)];
				}).slice(-logLength).map(function (line) {
					// truncate long lines
					var color = this.colorReplacement[line.charAt(0)] || ASCII_COLOR.reset;
					line = line.split('\n', 1)[0];
					return color + line.slice(0, this.dimensions.width) + ASCII_COLOR.reset;
				}, this).join('\n');
				charm.write('\n');
				charm.write(logs);
			}
		},

		_drawTotalReporter: function (report) {
			var charm = this.charm;
			var title = 'Total: ';
			var totalTextSize = String(report.numTotal).length;

			charm.write(title);
			this._drawProgressBar(report, this.dimensions.width - title.length);
			charm.write(nodeUtil.format('\nPassed: %s  Failed: %s  Skipped: %d\n',
				fit(report.numPassed, totalTextSize), fit(report.numFailed, totalTextSize), report.numSkipped));
		},

		_Report: Report
	};

	return Pretty;
});
