var balanced = require('../index'),
	fs = require('fs');

var examples = {
	bracketsBasic: fs.readFileSync(__dirname + '/example-text/brackets-basic.txt', 'utf8'),
	bracketsHead: fs.readFileSync(__dirname + '/example-text/brackets-head.txt', 'utf8'),
	comments: fs.readFileSync(__dirname + '/example-text/brackets-comments.txt', 'utf8'),
	comments2: fs.readFileSync(__dirname + '/example-text/brackets-comments2.txt', 'utf8')
};

describe('Matches', function() {
	it('can perform simple string matches', function() {
		expect(balanced.matches({source: examples.bracketsBasic, open: '{', close: '}'})).toEqual([
			{ index: 7, length: 6, head: '{', tail: '}' },
			{ index: 36, length: 9, head: '{', tail: '}' },
			{ index: 68, length: 10, head: '{', tail: '}' },
			{ index: 93, length: 25, head: '{', tail: '}' },
			{ index: 141, length: 19, head: '{', tail: '}' }
  		]);

  		expect(balanced.matches({source: examples.bracketsBasic, open: '(', close: ')'})).toEqual([
			{ index: 183, length: 6, head: '(', tail: ')' },
			{ index: 212, length: 9, head: '(', tail: ')' },
			{ index: 244, length: 10, head: '(', tail: ')' },
			{ index: 269, length: 25, head: '(', tail: ')' },
			{ index: 317, length: 19, head: '(', tail: ')' }
  		]);

  		expect(balanced.matches({source: examples.bracketsBasic, open: '[', close: ']'})).toEqual([
			{ index: 359, length: 6, head: '[', tail: ']' },
			{ index: 388, length: 9, head: '[', tail: ']' },
			{ index: 420, length: 10, head: '[', tail: ']' },
			{ index: 445, length: 25, head: '[', tail: ']' },
			{ index: 493, length: 19, head: '[', tail: ']' }
  		]);

  		expect(balanced.matches({source: examples.bracketsBasic, open: '<tag>', close: '</tag>'})).toEqual([
			{ index: 535, length: 15, head: '<tag>', tail: '</tag>' },
			{ index: 573, length: 18, head: '<tag>', tail: '</tag>' },
			{ index: 614, length: 37, head: '<tag>', tail: '</tag>' },
			{ index: 666, length: 52, head: '<tag>', tail: '</tag>' },
			{ index: 741, length: 46, head: '<tag>', tail: '</tag>' }
		]);
	});

	it('can perform simple regexp matches', function() {
		expect(balanced.matches({source: examples.bracketsBasic, open: /\[|\{|\(|<tag>/, close: /\]|\}|\)|<\/tag>/})).toEqual([
			{ index: 7, length: 6, head: '{', tail: '}' },
			{ index: 36, length: 9, head: '{', tail: '}' },
			{ index: 68, length: 10, head: '{', tail: '}' },
			{ index: 93, length: 25, head: '{', tail: '}' },
			{ index: 141, length: 19, head: '{', tail: '}' },
			{ index: 183, length: 6, head: '(', tail: ')' },
			{ index: 212, length: 9, head: '(', tail: ')' },
			{ index: 244, length: 10, head: '(', tail: ')' },
			{ index: 269, length: 25, head: '(', tail: ')' },
			{ index: 317, length: 19, head: '(', tail: ')' },
			{ index: 359, length: 6, head: '[', tail: ']' },
			{ index: 388, length: 9, head: '[', tail: ']' },
			{ index: 420, length: 10, head: '[', tail: ']' },
			{ index: 445, length: 25, head: '[', tail: ']' },
			{ index: 493, length: 19, head: '[', tail: ']' },
			{ index: 535, length: 15, head: '<tag>', tail: '</tag>' },
			{ index: 573, length: 18, head: '<tag>', tail: '</tag>' },
			{ index: 614, length: 37, head: '<tag>', tail: '</tag>' },
			{ index: 666, length: 52, head: '<tag>', tail: '</tag>' },
			{ index: 741, length: 46, head: '<tag>', tail: '</tag>' }
		]);
	});

	it('can perform head matches', function () {
		expect(balanced.matches({source: examples.bracketsHead, head: 'head (', open: '(', close: ')'})).toEqual([
			{ index: 8, length: 39, head: 'head (', tail: ')' },
			{ index: 120, length: 39, head: 'head (', tail: ')' }
		]);
	});

	it('can perform regexp head matches', function () {
		expect(balanced.matches({source: examples.bracketsHead, head: /head\d? \(/, open: '(', close: ')'})).toEqual([
			{ index: 8, length: 39, head: 'head (', tail: ')' },
			{ index: 63, length: 41, head: 'head2 (', tail: ')' },
			{ index: 120, length: 39, head: 'head (', tail: ')' },
			{ index: 175, length: 41, head: 'head2 (', tail: ')' }
		]);
	});

	it('can ignore matches', function () {
		var blockComments = balanced.matches({source: examples.comments, open: '/*', close: '*/'}),
			singleLineComments = balanced.getRangesForMatch(examples.comments, /^\s*\/\/.+$/gim);

		expect(balanced.matches({
			source: examples.comments,
			open: ['{', '[', '('],
			close: ['}', ']', ')'],
			ignore: Array.prototype.concat.call([], blockComments, singleLineComments)
		})).toEqual([
			{ index: 0, length: 71, head: '{', tail: '}' }
		]);

		expect(balanced.matches({
			source: examples.comments,
			open: ['{', '[', '('],
			close: ['}', ']', ')'],
			ignore: blockComments
		})).toEqual([
			{ index: 0, length: 71, head: '{', tail: '}' },
  			{ index: 75, length: 25, head: '{', tail: '}' }
		]);
	});

	it('can ignore matches 2', function () {
		var blockComments = balanced.matches({source: examples.comments2, open: '/*', close: '*/'}),
			singleLineComments = balanced.getRangesForMatch(examples.comments2, /^\s*\/\/.+$/gim);

		expect(balanced.matches({
			source: examples.comments2,
			open: ['{', '[', '('],
			close: ['}', ']', ')'],
			ignore: blockComments
		})).toEqual([
			{ index: 0, length: 2, head: '{', tail: '}' },
			{ index: 14, length: 2, head: '{', tail: '}' },
			{ index: 16, length: 2, head: '{', tail: '}' },
			{ index: 18, length: 8, head: '{', tail: '}' }
		]);

		expect(balanced.matches({
			source: examples.comments2,
			open: ['{', '[', '('],
			close: ['}', ']', ')'],
			ignore: Array.prototype.concat.call([], blockComments, singleLineComments)
		})).toEqual([
			{ index: 0, length: 2, head: '{', tail: '}' }
		]);
	});

	it('can match with complex custom ignore ', function () {
		function getQuoteRanges (string, ignore) {
			var quotes = balanced.getRangesForMatch(string, new RegExp('\'|"', 'g'));
			
			// filter out ingored ranges
			if (ignore) {
				quotes = balanced.rangesWithout(quotes, ignore);
			}

			var currect = null,
				ranges = [];
		
			quotes.forEach(function (quote) {
				if (currect && currect.match === quote.match) {
						ranges.push({
							index: currect.index,
							length: quote.index - currect.index + 1
						});
						currect = null;
				} else if (!currect) {
					currect = quote;
				}
			});

			return ranges;
		}

		var string =
			'/* {}" */\n' +
			'/* {}\' */\n' +
			'// {}"\n' +
			'// {}\'\n' +
			'{}\n' +
			'" /*{}*/ "\n' +
			'\' /*{}*/ \'\n' +
			'/* """ */\n' +
			'/* \'\'\' */\n' +
			'" {} "\n' +
			'\' {} \'\n' +
			'/* """ */\n' +
			'/* \'\'\' */\n';

		var blockComments = balanced.matches({source: string, open: '/*', close: '*/'}),
			singleLineComments = balanced.getRangesForMatch(string, /^\s*\/\/.+$/gim),
			ignores = Array.prototype.concat.call([], blockComments, singleLineComments),
			quotes = getQuoteRanges(string, ignores);

		// remove ignores inside of quotes
		ignores = balanced.rangesWithout(ignores, quotes);

		// option ignore code inside of quotes
		ignores = ignores.concat(quotes);

		expect(balanced.matches({
			source: string,
			open: ['{', '[', '('],
			close: ['}', ']', ')'],
			ignore: ignores
		})).toEqual([
			{ index : 34, length : 2, head : '{', tail : '}' }
		]);
	});
});