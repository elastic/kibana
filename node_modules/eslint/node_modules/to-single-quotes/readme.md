# to-single-quotes [![Build Status](https://travis-ci.org/sindresorhus/to-single-quotes.svg?branch=master)](https://travis-ci.org/sindresorhus/to-single-quotes)

> Convert matching double-quotes to single-quotes: `I "love" unicorns` => `I 'love' unicorns`


## Usage

```
$ npm install --save to-single-quotes
```

```js
var toSingleQuotes = require('to-single-quotes');

toSingleQuotes('I love "unicorns" \'and\' "ponies"');
//=> I love 'unicorns' 'and' 'ponies'
```


## CLI

```
$ npm install --global to-single-quotes
```

```
$ to-single-quotes --help

  Usage
    $ to-single-quotes <string>
    $ echo <string> | to-single-quotes

  Example
    $ to-single-quotes 'I love "unicorns"'
    I love 'unicorns'
```


## Related

See [to-double-quotes](https://github.com/sindresorhus/to-double-quotes) for the inverse.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
