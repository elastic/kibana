# get-urls [![Build Status](https://travis-ci.org/sindresorhus/get-urls.svg?branch=master)](https://travis-ci.org/sindresorhus/get-urls)

> Get all urls in a string

The urls will be normalized and uniquified.


## Install

Download [manually](https://github.com/sindresorhus/get-urls/releases) or with a package-manager.

```bash
$ npm install --save get-urls
```

```bash
$ bower install --save get-urls
```

```bash
$ component install sindresorhus/get-urls
```


## Usage

```js
var text = 'Lorem ipsum dolor sit amet, sindresorhus.com consectetuer adipiscing http://yeoman.io elit.';

getUrls(text);
//=> ['http://sindresorhus.com', 'http://yeoman.io']
```


## CLI

You can also use it as a CLI app by installing it globally:

```bash
$ npm install --global get-urls
```

#### Usage

```bash
$ get-urls -h

get-urls <input-file>
or
cat <input-file> | get-urls
```


## License

[MIT](http://opensource.org/licenses/MIT) © [Sindre Sorhus](http://sindresorhus.com)
