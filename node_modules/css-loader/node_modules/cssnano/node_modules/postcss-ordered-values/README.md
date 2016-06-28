# [postcss][postcss]-ordered-values [![Build Status](https://travis-ci.org/ben-eb/postcss-ordered-values.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-ordered-values.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-ordered-values.svg)][deps]

> Ensure values are ordered consistently in your CSS.

## Install

With [npm](https://npmjs.org/package/postcss-ordered-values) do:

```
npm install postcss-ordered-values --save
```

## Example

Some CSS properties accept their values in an arbitrary order; for this reason,
it is entirely possible that different developers will write their values in
different orders. This module normalizes the order, making it easier for other
modules to understand which declarations are duplicates.

### Input

```css
h1 {
    border: solid 1px red;
    border: red solid .5em;
    border: rgba(0, 30, 105, 0.8) solid 1px;
    border: 1px solid red;
}
```

### Output

```css
h1 {
    border: 1px solid red;
    border: .5em solid red;
    border: 1px solid rgba(0, 30, 105, 0.8);
    border: 1px solid red;
}
```

## Support List

For more examples, see the [tests](src/__tests__/index.js).

* border(border-left|right|top|bottom)
* outline
* flex-flow

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © [Ben Briggs](http://beneb.info)

[ci]:      https://travis-ci.org/ben-eb/postcss-ordered-values
[deps]:    https://gemnasium.com/ben-eb/postcss-ordered-values
[npm]:     http://badge.fury.io/js/postcss-ordered-values
[postcss]: https://github.com/postcss/postcss
