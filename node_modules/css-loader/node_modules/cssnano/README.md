<h1 align="center">
    <br>
    <img width="360" src="https://rawgit.com/ben-eb/cssnano/master/media/logo.svg" alt="cssnano">
    <br>
    <br>
    <br>
</h1>

> A modular minifier, built on top of the [PostCSS] ecosystem.

[![Build Status](https://travis-ci.org/ben-eb/cssnano.svg?branch=master)][ci] [![Build status](https://ci.appveyor.com/api/projects/status/t1chyvhobtju7jy8/branch/master?svg=true)](https://ci.appveyor.com/project/ben-eb/cssnano/branch/master) [![NPM version](https://badge.fury.io/js/cssnano.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/cssnano.svg)][deps] [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/ben-eb/cssnano?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

cssnano is a modular minifier that aims to utilise small modules from the
PostCSS ecosystem, rather than being an all-encompassing module that may be
difficult to contribute to. Because it is written on top of PostCSS, it is able
to do more than simple whitespace transforms - including advanced optimisations
such as custom identifier reduction, `z-index` rebasing, and adjacent selector
merging.

For further details check out the [website](http://cssnano.co/):

* [Installation guide for your build process](http://cssnano.co/usage/).
* [Full list of optimisations](http://cssnano.co/optimisations/).
* [Customise the output (options documentation)](http://cssnano.co/options/).

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © [Ben Briggs](http://beneb.info)

[PostCSS]:                      https://github.com/postcss/postcss

[ci]:                           https://travis-ci.org/ben-eb/cssnano
[deps]:                         https://gemnasium.com/ben-eb/cssnano
[npm]:                          http://badge.fury.io/js/cssnano
