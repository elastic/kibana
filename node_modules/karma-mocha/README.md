# karma-mocha

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-mocha)
 [![npm version](https://img.shields.io/npm/v/karma-mocha.svg?style=flat-square)](https://www.npmjs.com/package/karma-mocha) [![npm downloads](https://img.shields.io/npm/dm/karma-mocha.svg?style=flat-square)](https://www.npmjs.com/package/karma-mocha)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-mocha/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-mocha) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-mocha.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-mocha) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-mocha.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-mocha#info=devDependencies)

> Adapter for the [Mocha](http://mochajs.org/) testing framework.

## Installation

The easiest way is to keep `karma-mocha` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma-mocha": "~0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-mocha --save-dev
```

Instructions on how to install `karma` can be found [here.](http://karma-runner.github.io/0.12/intro/installation.html)

## Configuration
Following code shows the default configuration...
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['mocha'],

    files: [
      '*.js'
    ]
  });
};
```

If you want to pass configuration options directly to mocha you can
do this in the following way

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['mocha'],

    files: [
      '*.js'
    ],

    client: {
      mocha: {
        reporter: 'html', // change Karma's debug.html to the mocha web reporter
        ui: 'tdd'
      }
    }
  });
};
```

If you want run only some tests matching a given pattern you can
do this in the following way

```sh
karma start &
karma run -- --grep=<pattern>
```

or

```js
module.exports = function(config) {
  config.set({
    ...
    client: {
      args: ['--grep', '<pattern>'],
      ...
    }
  });
};
```

`--grep` argument pass directly to mocha


----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
