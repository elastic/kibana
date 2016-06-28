/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var loaderUtils = require("loader-utils");
module.exports = function getLocalIdent(loaderContext, localIdentName, localName, options) {
	var request = loaderContext.options && typeof loaderContext.options.context === "string" ?
		loaderUtils.stringifyRequest({ context: loaderContext.options.context }, loaderUtils.getRemainingRequest(loaderContext)) :
		loaderContext.request;
	options.content = localName + " " + request;
	options.context = loaderContext.options && typeof loaderContext.options.context === "string" ? loaderContext.options.context : loaderContext.context;
	localIdentName = localIdentName.replace(/\[local\]/gi, localName);
	var hash = loaderUtils.interpolateName(loaderContext, localIdentName, options);
	return hash.replace(new RegExp("[^a-zA-Z0-9\\-_\u00A0-\uFFFF]", "g"), "-").replace(/^([^a-zA-Z_])/, "_$1");
};
