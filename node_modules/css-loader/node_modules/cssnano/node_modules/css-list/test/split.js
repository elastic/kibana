var test = require('tape'),
	list = require('..'),
	split = list.split;

test('css-list.split', function (t) {
	var spaces = [' ', '\n', '\t'],
		comma = [','];

	t.deepEqual(split('a b', spaces), ['a', 'b'],
		'splits list by spaces');

	t.deepEqual(split(' a  b ', spaces), ['a', 'b'],
		'trims values');

	t.deepEqual(split('"a b\\"" \'\'', spaces), ['"a b\\""', "''"],
		'checks quotes');

	t.deepEqual(split('f( )) a( () )', spaces), ['f( ))', 'a( () )'],
		'checks functions');

	t.deepEqual(split('a, b', comma, true), ['a', 'b'],
		'splits list by spaces');

	t.deepEqual(split('a, b,', comma, true), ['a', 'b', ''],
		'adds last empty');

	t.deepEqual(split('"a,b\\"", \'\'', comma, true), ['"a,b\\""', "''"],
		'checks quotes');

	t.deepEqual(split('f(,)), a(,(),)', comma, true), ['f(,))', 'a(,(),)'],
		'checks functions');

	t.end();
});
