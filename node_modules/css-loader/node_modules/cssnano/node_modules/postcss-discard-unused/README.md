# [postcss][postcss]-discard-unused [![Build Status](https://travis-ci.org/ben-eb/postcss-discard-unused.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-discard-unused.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-discard-unused.svg)][deps]

> Discard unused counter styles, keyframes and fonts.

## Install

With [npm](https://npmjs.org/package/postcss-discard-unused) do:

```
npm install postcss-discard-unused --save
```

## Example

This module will discard unused at rules in your CSS file, if it cannot find
any selectors that make use of them. It works on `@counter-style`, `@keyframes`
and `@font-face`.

### Input

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

@counter-style custom2 {
    system: extends decimal;
    suffix: "| "
}

a {
    list-style: custom
}
```

### Output

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

a {
    list-style: custom
}
```

Note that this plugin is not responsible for normalising font families, as it
makes the assumption that you will write your font names consistently, such that
it considers these two declarations differently:

```css
h1 {
    font-family: "Helvetica Neue"
}

h2 {
    font-family: Helvetica Neue
}
```

However, you can mitigate this by including [postcss-font-family][fontfam]
*before* this plugin, which will take care of normalising quotes, and
deduplicating. For more examples, see the [tests](test.js).

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © [Ben Briggs](http://beneb.info)

[ci]:      https://travis-ci.org/ben-eb/postcss-discard-unused
[deps]:    https://gemnasium.com/ben-eb/postcss-discard-unused
[npm]:     http://badge.fury.io/js/postcss-discard-unused
[postcss]: https://github.com/postcss/postcss
