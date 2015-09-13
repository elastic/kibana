# cssnano [![Build Status](https://travis-ci.org/ben-eb/cssnano.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/cssnano.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/cssnano.svg)][deps] [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/ben-eb/cssnano?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

> A modular minifier, built on top of the [PostCSS] ecosystem.

*Note that this project is still a work in progress, and needs more testing
before it can be recommended to use in production. There are some optimisations
that need to be further expanded upon, and others yet to be written.*

cssnano is a modular minifier that aims to utilise small modules from the
PostCSS ecosystem, rather than being an all-encompassing module that may be
difficult to contribute to. Because it is written on top of PostCSS, it is able
to do more than simple whitespace transforms - including advanced optimisations
such as custom identifier reduction, `z-index` rebasing, and adjacent selector
merging.

## Install

With [npm](https://npmjs.org/package/cssnano) do:

```
npm install cssnano
```

## Usage

### CLI

cssnano ships with a command line app.

```
cssnano main.css
```

To output this to a file specify a second parameter:

```
cssnano main.css main.min.css
```

You can also use stdin & stdout redirections:

```
cssnano < main.css > main.min.css
```

To see all available options, do:

```
cssnano --help
```

### gulp

Use [`gulp-cssnano`].

### grunt

Use [`grunt-cssnano`].

### broccoli

Use [`broccoli-cssnano`].

### Scripting

cssnano can be used directly via its node.js API, or consumed as a PostCSS
plugin.

#### node.js (`nano(css, [options])`)

```js
var nano      = require('cssnano');
var readFile  = require('fs').readFileSync;
var writeFile = require('fs').writeFileSync;

var input = readFile('main.css', 'utf8');

writeFile('main.min.css', nano(input));
```

#### PostCSS (`nano([options])`)

```js
var nano      = require('cssnano');
var readFile  = require('fs').readFileSync;
var writeFile = require('fs').writeFileSync;
var postcss   = require('postcss');

var input  = readFile('main.css', 'utf8');
var output = postcss().use(nano()).use(/* other plugin */).process(input).css;

writeFile('main.min.css', output);
```

#### Options

##### sourcemap

Set this to `true` to generate an inline source map.

##### zindex

Set this to `false` to disable z-index transforms.

##### calc

Set this to `false` to disable calc transforms. If it is an object, it will be
passed as the options to [`postcss-calc`].

##### urls

Set this to `false` to disable URL normalisation. If it is an object, it will be
passed as the options to [`postcss-normalize-url`].

##### idents

Set this to `false` to disable custom identifier reduction.

##### merge

Set this to `false` to disable merging of rules.

##### unused

Set this to `false` to disable unused at-rule removal.

##### comments

If this is an object, it will be passed as the options to
[`postcss-discard-comments`].

## Motivation

As of this writing, there are *many* ways to minify CSS available; for the Node
ecosystem alone, there are lots of [modules] that offer this functionality.
However, some of these projects are buggy and others are not being maintained.
Furthermore, it is difficult to contribute to such projects with large amounts
of integrated code. What if we could utilise the power of modularity and split
up a CSS minifier into small pieces that have single responsibility? This
project's aim is, eventually, to become entirely composed of node modules that
are responsible for small CSS optimisations. At present, it is composed of the
following modules:

* [`postcss-calc`]: Convert `calc()` functions where possible.
  `calc(5 * 10px)` -> `50px`
* [`postcss-colormin`]: Convert colors into their smallest representation.
  `#ff0000` -> `red`
* [`postcss-convert-values`]: Convert time/length values.
  `500ms` -> `.5s`
* [`postcss-discard-comments`]: Discard comments, unless marked as special.
* [`postcss-discard-duplicates`]: Discard duplicate rules.
* [`postcss-discard-empty`]: Discard empty rules and media queries.
* [`postcss-discard-unused`]: Discard unused at-rules.
* [`postcss-font-family`]: Optimise whitespace/quoting of `font-family`
  properties.
* [`postcss-merge-idents`]: Merge duplicated `@keyframes` and `@counter-style`
  identifiers with different names.
* [`postcss-merge-rules`]: Merge adjacent rules together.
* [`postcss-minify-font-weight`]: Convert `bold` -> `700` and `normal` -> `400`
* [`postcss-minify-selectors`]: Optimise whitespace/quoting of selectors.
* [`postcss-normalize-url`]: Optimise URL representations.
* [`postcss-pseudoelements`]: Optimise double colon pseudo syntax to the single
  colon syntax.
* [`postcss-reduce-idents`]: Rename `@keyframes`, `@counter-style` and `counter`
  identifiers to save space.
* [`postcss-single-charset`]: Ensure that there is only one `@charset` in the
  CSS file.
* [`postcss-unique-selectors`]: Ensure selectors are unique.
* [`postcss-zindex`]: Rebase `z-index` values to save space.

There are some optimisations that are not quite ready to be released as
separate modules yet, and these are still integrated into this module.

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © [Ben Briggs](http://beneb.info)

[modules]:                      https://github.com/ben-eb/css-minifiers
[PostCSS]:                      https://github.com/postcss/postcss

[`postcss-calc`]:               https://github.com/postcss/postcss-calc
[`postcss-colormin`]:           https://github.com/ben-eb/postcss-colormin
[`postcss-convert-values`]:     https://github.com/ben-eb/postcss-convert-values
[`postcss-discard-comments`]:   https://github.com/ben-eb/postcss-discard-comments
[`postcss-discard-duplicates`]: https://github.com/ben-eb/postcss-discard-duplicates
[`postcss-discard-empty`]:      https://github.com/ben-eb/postcss-discard-empty
[`postcss-discard-unused`]:     https://github.com/ben-eb/postcss-discard-unused
[`postcss-font-family`]:        https://github.com/ben-eb/postcss-font-family
[`postcss-merge-idents`]:       https://github.com/ben-eb/postcss-merge-idents
[`postcss-merge-rules`]:        https://github.com/ben-eb/postcss-merge-rules
[`postcss-minify-font-weight`]: https://github.com/ben-eb/postcss-minify-font-weight
[`postcss-minify-selectors`]:   https://github.com/ben-eb/postcss-minify-selectors
[`postcss-normalize-url`]:      https://github.com/ben-eb/postcss-normalize-url
[`postcss-pseudoelements`]:     https://github.com/axa-ch/postcss-pseudoelements
[`postcss-reduce-idents`]:      https://github.com/ben-eb/postcss-reduce-idents
[`postcss-single-charset`]:     https://github.com/hail2u/postcss-single-charset
[`postcss-unique-selectors`]:   https://github.com/ben-eb/postcss-unique-selectors
[`postcss-zindex`]:             https://github.com/ben-eb/postcss-zindex

[`gulp-cssnano`]:               https://github.com/ben-eb/gulp-cssnano
[`grunt-cssnano`]:              https://github.com/sindresorhus/grunt-cssnano
[`broccoli-cssnano`]:           https://github.com/sindresorhus/broccoli-cssnano

[ci]:                           https://travis-ci.org/ben-eb/cssnano
[deps]:                         https://gemnasium.com/ben-eb/cssnano
[npm]:                          http://badge.fury.io/js/cssnano
