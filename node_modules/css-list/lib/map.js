var defaults = require('./defaults');
var each = require('./each');

/**
* @param string String
* @param separators Array
* @param cb Function (value, type, prev, prevType) return value
* @return String
*/
module.exports = defaults(function (string, separators, cb) {
	var array = [];
	var prev = null;
	var prevType = null;

	each(string, separators, function (value, type) {
		var result,
			trimmed = value.trim();

		if(type === 'separator') {
			array.push(value);
		} else {
			result = cb(trimmed, type, prev, prevType);
			if(result !== undefined) {
				value = value.replace(trimmed, result.toString().replace(/\$/g, '$$$$'));
			}
			array.push(value);
		}

		if(type !== 'separator') {
			prev = trimmed;
			prevType = type;
		}
	});

	return array.join('');
});
