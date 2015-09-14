'use strict';
module.exports = function (str) {
	return str.replace(/(?:\\*)?"([^"\\]*\\.)*[^"]*"/g, function (match) {
		return match
			.replace(/\\"/g, '"')                        // unescape double-quotes
			.replace(/(^|[^\\])(\\+)'/g, '$1$2\\\'')     // escape escapes
			.replace(/([^\\])'/g, '$1\\\'')              // escape single-quotes - round 1
			.replace(/([^\\])'/g, '$1\\\'')              // escape single-quotes - round 2 (for consecutive single-quotes)
			.replace(/^"|"$/g, '\'');                    // convert
	});
};
