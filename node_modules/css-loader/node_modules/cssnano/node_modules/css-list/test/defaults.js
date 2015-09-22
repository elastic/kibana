var test = require('tape'),
	list = require('..'),
	each = list.each,
	split = list.split,
	map = list.map;

test('css-list defaults', function (t) {
	t.plan(4);

	var result = [];
	each('h1,h2', function (item) {
		result.push(item);
	});

	t.equal(result.length, 3);

	t.equal(map('h1,h2', function (item) { return item; }), 'h1,h2');

	t.deepEqual(split('h1,h2,'), ['h1', 'h2']);
	t.deepEqual(split('h1,h2,', true), ['h1', 'h2', '']);
});