# to-double-quotes [![Build Status](https://travis-ci.org/sindresorhus/to-double-quotes.svg?branch=master)](https://travis-ci.org/sindresorhus/to-double-quotes)

> Convert matching single-quotes to double-quotes: `I 'love' unicorns` => `I "love" unicorns`


## Usage

```
$ npm install --save to-double-quotes
```

```js
var toDoubleQuotes = require('to-double-quotes');

toDoubleQuotes('I love \'unicorns\' "and" \'ponies\'');
//=> I love "unicorns" "and" "ponies"
```


## CLI

```
$ npm install --global to-double-quotes
```

```
$ to-double-quotes --help

  Usage
    $ to-double-quotes <string>
    $ echo <string> | to-double-quotes

  Example
    $ to-double-quotes "I love 'unicorns'"
    I love "unicorns"
```


## Related

See [to-single-quotes](https://github.com/sindresorhus/to-single-quotes) for the inverse.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
