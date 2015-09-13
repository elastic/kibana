/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var loaderUtils = require("loader-utils");
var processCss = require("./processCss");
var getImportPrefix = require("./getImportPrefix");


module.exports = function(content) {
	if(this.cacheable) this.cacheable();
	var query = loaderUtils.parseQuery(this.query);
	var moduleMode = query.modules || query.module;

	var result = processCss(content, null, {
		mode: moduleMode ? "local" : "global",
		query: query,
		minimize: this.minimize,
		loaderContext: this
	});

	// for importing CSS
	var importUrlPrefix = getImportPrefix(this, query);

	function importItemMatcher(item) {
		var match = result.importItemRegExp.exec(item);
		var idx = +match[1];
		var importItem = result.importItems[idx];
		var importUrl = importUrlPrefix + importItem.url;
		return "\" + require(" + loaderUtils.stringifyRequest(this, importUrl) + ")" +
			"[" + JSON.stringify(importItem.export) + "] + \"";
	}

	var exportJs = "";
	if(Object.keys(result.exports).length > 0) {
		exportJs = Object.keys(result.exports).map(function(key) {
			var valueAsString = JSON.stringify(result.exports[key]);
			valueAsString = valueAsString.replace(result.importItemRegExpG, importItemMatcher.bind(this));
			return "\t" + JSON.stringify(key) + ": " + valueAsString;
		}.bind(this)).join(",\n");
		exportJs = "module.exports = {\n" + exportJs + "\n};";
	}

	return exportJs;
};
