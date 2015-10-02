'use strict';
module.exports = function (str) {
	return str.replace(/(?:\\*)?'([^'\\]*\\.)*[^']*'/g, function (match) {
		return match
			.replace(/\\'/g, '\'')                    // unescape single-quotes
			.replace(/(^|[^\\])(\\+)"/g, '$1$2\\\"')  // escape escapes
			.replace(/([^\\])"/g, '$1\\\"')           // escape double-quotes
			.replace(/^'|'$/g, '"');                  // convert
	});
};
