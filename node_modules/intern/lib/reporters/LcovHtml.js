define([
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/html',
	'dojo/node!istanbul/index'
], function (Collector, Reporter) {
	function LcovHtmlReporter(config) {
		config = config || {};

		this._collector = new Collector();
		this._reporter = new Reporter({
			dir: config.directory,
			watermarks: config.watermarks
		});
	}

	LcovHtmlReporter.prototype.coverage = function (sessionId, coverage) {
		this._collector.add(coverage);
	};

	LcovHtmlReporter.prototype.runEnd = function () {
		this._reporter.writeReport(this._collector, true);
	};

	return LcovHtmlReporter;
});
