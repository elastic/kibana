# karma-coverage

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-coverage)
 [![npm version](https://img.shields.io/npm/v/karma-coverage.svg?style=flat-square)](https://www.npmjs.com/package/karma-coverage) [![npm downloads](https://img.shields.io/npm/dm/karma-coverage.svg?style=flat-square)](https://www.npmjs.com/package/karma-coverage)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-coverage/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-coverage) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-coverage.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-coverage) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-coverage.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-coverage#info=devDependencies)

> Generate code coverage using [Istanbul].

## Installation

The easiest way is to install `karma-coverage` as a `devDependency`,
by running

```bash
npm install karma karma-coverage --save-dev
```

## Configuration

For configuration details see [docs/configuration](docs/configuration.md).

## Examples

### Basic

```javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'src/**/*.js',
      'test/**/*.js'
    ],

    // coverage reporter generates the coverage
    reporters: ['progress', 'coverage'],

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'src/**/*.js': ['coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    }
  });
};
```
### CoffeeScript

For an example on how to use with [CoffeeScript](http://coffeescript.org/)
see [examples/coffee](examples/coffee).

### Advanced, multiple reporters

```javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'src/**/*.js',
      'test/**/*.js'
    ],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/**/*.js': ['coverage']
    },
    coverageReporter: {
      // specify a common output directory
      dir: 'build/reports/coverage',
      reporters: [
        // reporters not supporting the `file` property
        { type: 'html', subdir: 'report-html' },
        { type: 'lcov', subdir: 'report-lcov' },
        // reporters supporting the `file` property, use `subdir` to directly
        // output them in the `dir` directory
        { type: 'cobertura', subdir: '.', file: 'cobertura.txt' },
        { type: 'lcovonly', subdir: '.', file: 'report-lcovonly.txt' },
        { type: 'teamcity', subdir: '.', file: 'teamcity.txt' },
        { type: 'text', subdir: '.', file: 'text.txt' },
        { type: 'text-summary', subdir: '.', file: 'text-summary.txt' },
      ]
    }
  });
});
```

### FAQ

#### Don't minify instrumenter output

When using the istanbul instrumenter (default), you can disable code compaction by adding the following to your configuration.

```javascript
// karma.conf.js
module.exports = function(config) {
  config.set({
    coverageReporter: {
      instrumenterOptions: {
        istanbul: { noCompact: true }
      }
    }
  });
};
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
[Istanbul]: https://github.com/gotwarlost/istanbul
