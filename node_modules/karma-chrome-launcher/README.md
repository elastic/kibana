# karma-chrome-launcher

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-chrome-launcher)
 [![npm version](https://img.shields.io/npm/v/karma-chrome-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-chrome-launcher) [![npm downloads](https://img.shields.io/npm/dm/karma-chrome-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-chrome-launcher)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-chrome-launcher/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-chrome-launcher) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-chrome-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-chrome-launcher) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-chrome-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-chrome-launcher#info=devDependencies)

> Launcher for Google Chrome and Google Chrome Canary.

## Installation

The easiest way is to keep `karma-chrome-launcher` as a devDependency in your `package.json`,
by running

```bash
$ npm install karma-chrome-launcher --save-dev
```

## Configuration

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    browsers: ['Chrome', 'Chrome_without_security'],

    // you can define custom flags
    customLaunchers: {
      Chrome_without_security: {
        base: 'Chrome',
        flags: ['--disable-web-security']
      }
    }
  })
}
```

You can pass list of browsers as a CLI argument too:

```bash
$ karma start --browsers Chrome,Chrome_without_security
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
