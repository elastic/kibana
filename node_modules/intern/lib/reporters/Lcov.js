define([
	'dojo/node!istanbul/lib/collector',
	'dojo/node!istanbul/lib/report/lcovonly'
], function (Collector, Reporter) {
	function LcovReporter(config) {
		config = config || {};

		this._collector = new Collector();
		this._reporter = new Reporter({
			file: config.filename,
			watermarks: config.watermarks
		});
	}

	LcovReporter.prototype.coverage = function (sessionId, coverage) {
		this._collector.add(coverage);
	};

	LcovReporter.prototype.runEnd = function () {
		this._reporter.writeReport(this._collector, true);
	};

	return LcovReporter;
});
