var test = require('tape'),
	list = require('..'),
	each = list.each;

var tests = [{
	message: 'splits list by spaces',
	fixtures: 'a  b',
	separators: [' '],
	result: [
		['a', null],
		[' ', 'separator'],
		[' ', 'separator'],
		['b', null]
	]
}, {
	message: 'splits list by spaces',
	fixtures: ' a  b ',
	separators: [' '],
	result: [
		[' ', 'separator'],
		['a', null],
		[' ', 'separator'],
		[' ', 'separator'],
		['b', null],
		[' ', 'separator']
	]
}, {
	message: 'splits list by spaces and comma with quotes',
	fixtures: ' a, "hello, world!" b ',
	separators: [' ', ','],
	result: [
		[' ', 'separator'],
		['a', null],
		[',', 'separator'],
		[' ', 'separator'],
		['"hello, world!"', 'quote'],
		[' ', 'separator'],
		['b', null],
		[' ', 'separator']
	]
}, {
	message: 'splits list by comma with spaces',
	fixtures: ' a, "hello, world!",\t b ',
	separators: [','],
	result: [
		[' a', null],
		[',', 'separator'],
		[' "hello, world!"', 'quote'],
		[',', 'separator'],
		['\t b ', null],
	]
}];

test('css-list.each', function (t) {
	tests.forEach(function (item) {
		var result = [];
		each(item.fixtures, item.separators, function () {
			result.push(Array.prototype.map.call(arguments, function (item) { return item; }));
		});

		t.deepEqual(result, item.result, item.message);
	});

	t.end();
});
