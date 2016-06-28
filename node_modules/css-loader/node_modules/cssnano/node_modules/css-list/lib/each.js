var defaults = require('./defaults');

/**
* @param string String
* @param separators Array
* @param cb Function (value, type) where type is one of ['separator', 'quote', 'func', null]
*/
module.exports = defaults(function (string, separators, cb) {
	var i, max, letter;

	var split = false;
	var func = 0;
	var quote = false;
	var escape = false;
	var current = '';
	var type = null;

	for(i = 0, max = string.length; i < max; i++) {
		letter = string[i];

		if (quote) {
			if (escape) {
				escape = false;
			} else if (letter === '\\') {
				escape = true;
			} else if (letter === quote) {
				quote = false;
				type = 'quote';
			}
		} else if (letter === '"' || letter === '\'') {
			quote = letter;
		} else if (letter === '(') {
			func += 1;
		} else if (letter === ')') {
			if (func > 0) {
				func -= 1;
			}
			type = 'func';
		} else if (func === 0) {
			if (separators.indexOf(letter) > -1) {
				split = true;
			}
		}

		if(split) {
			if (current !== '') {
				cb(current, type);
				current = '';
				type = null;
			}
			cb(letter, 'separator')
			split = false;
		} else {
			current += letter;
		}
	}

	if(current !== '') {
		cb(current, type);
	}
});
