var test = require('tape'),
	list = require('..'),
	map = list.map;

test('css-list.map', function (t) {
	t.equal(map(' a b ', [' '], function (val, type, prev, prevType) {
		return 'val';
	}), ' val val ');

	t.equal(map(' a, "hello, world!" b ', [' ', ','], function (val, type, prev, prevType) {
		if(type === 'quote') {
			return 'quote';
		}

		if(prevType === 'quote') {
			return prev;
		}
	}), ' a, quote "hello, world!" ');

	t.equal(map('\t\t&:hover  , &:active ', [','], function (val) {
		return 'hello';
	}), '\t\thello  , hello ')


	t.equal(map("'$'", function (val) {
		return val;
	}), "'$'")

	t.end();
});
