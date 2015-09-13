# [postcss][postcss]-minify-font-weight [![Build Status](https://travis-ci.org/ben-eb/postcss-minify-font-weight.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-minify-font-weight.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-minify-font-weight.svg)][deps]

> Minimise `font-weight` values in your CSS.

## Install

With [npm](https://npmjs.org/package/postcss-minify-font-weight) do:

```
npm install postcss-minify-font-weight --save
```

## Example

### Input

```css
h1 {
    font-weight: bold;
    font-weight: normal;
}
```

### Output

```css
h1 {
    font-weight: 700;
    font-weight: 400;
}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © [Ben Briggs](http://beneb.info)

[ci]:      https://travis-ci.org/ben-eb/postcss-minify-font-weight
[deps]:    https://gemnasium.com/ben-eb/postcss-minify-font-weight
[npm]:     http://badge.fury.io/js/postcss-minify-font-weight
[postcss]: https://github.com/postcss/postcss
