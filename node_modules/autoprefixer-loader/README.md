# autoprefixer-loader [![Build Status](https://travis-ci.org/passy/autoprefixer-loader.svg?branch=master)](https://travis-ci.org/passy/autoprefixer-loader) [![Dependency Status](https://gemnasium.com/passy/autoprefixer-loader.png)](https://gemnasium.com/passy/autoprefixer-loader) [![Code Climate](https://codeclimate.com/github/passy/autoprefixer-loader.png)](https://codeclimate.com/github/passy/autoprefixer-loader)

An [autoprefixer](https://github.com/ai/autoprefixer) loader for [webpack](https://github.com/webpack/webpack).

## Usage

```js
var css = require('!raw!autoprefixer!./file.css'); // Just the CSS
var css = require('!css!autoprefixer!./file.css'); // CSS with processed url(...)s
```

See [css-loader](https://github.com/webpack/css-loader) to see the effect of processed `url(...)`s.

Or within the webpack config:

```js
module: {
  loaders: [{
    test: /\.css$/,
    loader: 'css-loader!autoprefixer-loader?browsers=last 2 version'
  }]
}
```

Then you can: `var css = require('./file.css');`.

Use in tandem with the [style-loader](https://github.com/webpack/style-loader) to add the css rules to your `document`:

```js
module: {
  loaders: [{
    test: /\.css/,
    loader: 'style-loader!css-loader!autoprefixer-loader'
  }]
}
```

and then `require('./file.css');` will compile and add the CSS to your page.

## Options

### `browsers`

Specify a single browser to support. [Read
  more](https://github.com/postcss/autoprefixer#browsers)

```js
loaders: [{
  loader: 'css-loader!autoprefixer-loader?browsers=last 2 version',
  ...
}]
```

For a list of browsers use JSON syntax.
```js
loaders: [{
  loader: 'css-loader!autoprefixer-loader?{browsers:["last 2 version", "Firefox 15"]}',
  ...
}]
```

### `cascade`

*Default: true*

When disabled, autoprefixer creates no visual cascade for the generated
prefixes.
[Read more](https://github.com/postcss/autoprefixer#visual-cascade)

```js
loaders: [{
  loader: 'css-loader!autoprefixer-loader?cascade=false',
  ...
}]
```

### `safe`

*Default: false*

When enabled, autoprefixer will attempt to parse invalid CSS. [Read
more](https://github.com/postcss/autoprefixer-core#safe-mode)

```js
loaders: [{
  loader: 'css-loader!autoprefixer-loader?safe=true',
  ...
}]
```

## Install

`npm install autoprefixer-loader --save-dev`

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.

## Release History
* 2.0.0 - Updated autoprefixer + postcss
* 1.2.0 - Added support for existing sourcemaps from earlier in the chain
* 0.1.0 - Initial release

## License
Licensed under the MIT license.
