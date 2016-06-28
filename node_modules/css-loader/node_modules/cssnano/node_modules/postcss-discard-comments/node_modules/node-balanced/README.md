# Balanced [![Build Status](https://travis-ci.org/icodeforlove/node-balanced.png?branch=master)](https://travis-ci.org/icodeforlove/node-balanced)

balanced string matching, and replacing.

# install

```
npm install node-balanced
```

## example time

lets say you have

```css
{
	@hello 1 {
		a {
		}
	}
	@hello 2 {
		a {
		}
	}
	@hello 3 {
		a {
		}
	}
}
```

and you would like to replace the @hello block easily, balanced allows you to do this

```javascript
var balanced = require('node-balanced');

balanced.replacements({
	source: source,
	head: /@hello \d \{/, // optional (defalut: open)
	open: '{',
	close: '}',
	balance: false, // optional (default: false)
	exceptions: false, // optional (default: false)
	replace: function (source, head, tail) {
		return head + source + tail;
	}
});
```

this is a simple and efficient way to make balanced replacements, without a parser.

## matching

you can get balanced matches by doing the following

```javascript
var balanced = require('node-balanced');

balanced.matches({
	source: source,
	head: /@hello \d \{/, // optional (defalut: open)
	open: '{',
	close: '}',
	balance: false, // optional (default: false) when set to true it will return `null` when there is an error
	exceptions: false // optional (default: false),
	ignore: [] // array of ignore ranges/matches
});
```

## multiple head/open/close

you can match multiple head/open/close efficiently by doing this

```javascript
var isBalanced = balanced.matches({
	source: '{[({)]}}',
	open: ['{', '[', '('],
	close: ['}', ']', ')'],
	balance: true
});
```
## ignore
ignore is supported by the `matches` and `replacements` methods, this is very useful for something like not matching inside of comments

```
var blockComments = balanced.matches({source: source, open: '/*', close: '*/'}),
	singleLineComments = balanced.getRangesForMatch(source, /^\s*\/\/.+$/gim);

balanced.matches({
	source: source,
	head: /@hello \d \{/,
	open: '{',
	close: '}',
	ignore: Array.prototype.concat.call([], blockComments, singleLineComments),
	replace: function (source, head, tail) {
		return head + source + tail;
	}
});
```

## advanced

in this example we have code and we want to avoid replacing text thats inside of the multiline/singleline comments, and quotes

```css
{
	@hello 1 {
		a {
		}
	}
/*
	@hello 2 {
		a {
		}
	}
*/
	@hello 3 {
		a {
		}
	}
// @hello 4 {}
}

var hello = "@hello 5 {}";
```

with balanced you can do this

```javascript
	// returns quote ranges with option ignore filter
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

	var blockComments = balanced.matches({source: string, open: '/*', close: '*/'}),
		singleLineComments = balanced.getRangesForMatch(string, /^\s*\/\/.+$/gim),
		ignores = Array.prototype.concat.call([], blockComments, singleLineComments),
		quotes = getQuoteRanges(string, ignores);

	// remove ignores inside of quotes
	ignores = balanced.rangesWithout(ignores, quotes);

	// optional ignore code inside of quotes
	ignores = ignores.concat(quotes);
	
	// run your matches or replacements method
	balanced.matches({
		source: string,
		head: /@hello \d \{/,
		open: '{',
		close: '}',
		ignore: ignores
	});
```

as you can see by using these principles you can accomplish this kind of stuff easily