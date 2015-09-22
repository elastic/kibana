# normalize-url [![Build Status](https://travis-ci.org/sindresorhus/normalize-url.svg?branch=master)](https://travis-ci.org/sindresorhus/normalize-url)

> [Normalize](http://en.wikipedia.org/wiki/URL_normalization) a URL

Useful when you need to display, store, deduplicate, sort, compare, etc, URLs.


## Install

```
$ npm install --save normalize-url
```


## Usage

```js
var normalizeUrl = require('normalize-url');

normalizeUrl('sindresorhus.com');
//=> 'http://sindresorhus.com'

normalizeUrl('HTTP://xn--xample-hva.com:80/?b=bar&a=foo');
//=> 'http://êxample.com/?a=foo&b=bar'
```


## API

### normalizeUrl(url, [options])

#### url

*Required*  
Type: `string`

URL to normalize.

#### options

##### normalizeProtocol

Type: `boolean`  
Default: `true`

Prepend `http:` to the URL if it's protocol-relative.

```js
normalizeUrl('//sindresorhus.com:80/');
//=> 'http://sindresorhus.com'

normalizeUrl('//sindresorhus.com:80/', {normalizeProtocol: false});
//=> '//sindresorhus.com'
```

##### stripFragment

Type: `boolean`  
Default: `true`

Remove the fragment at the end of the URL.

```js
normalizeUrl('sindresorhus.com/about.html#contact');
//=> 'http://sindresorhus.com/about.html'

normalizeUrl('sindresorhus.com/about.html#contact', {stripFragment: false});
//=> 'http://sindresorhus.com/about.html#contact'
```

##### stripWWW

Type: `boolean`  
Default: `true`

Remove `www.` from the URL.

```js
normalizeUrl('http://www.sindresorhus.com/about.html#contact');
//=> 'http://sindresorhus.com/about.html#contact'

normalizeUrl('http://www.sindresorhus.com/about.html#contact', {stripWWW: false});
//=> 'http://www.sindresorhus.com/about.html#contact'
```


## Related

- [compare-urls](https://github.com/sindresorhus/compare-urls) - Compare URLs by first normalizing them


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
