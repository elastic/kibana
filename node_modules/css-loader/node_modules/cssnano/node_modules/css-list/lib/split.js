var defaults = require('./defaults');
var each = require('./each');

/**
* @param string String
* @param separators Array
* @param last Boolean
* @return Array
*/
module.exports = defaults(function (string, separators, last) {
	var array = [];
	var isLastSep = false;

	each(string, separators, function (value, type) {
		if(type !== 'separator') {
			array.push(value.trim());
			isLastSep = false;
		} else {
			isLastSep = true;
		}
	});

	if(last && isLastSep) {
		array.push('');
	}

	return array;
});