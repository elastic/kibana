# karma-ng-scenario [![Build Status](https://travis-ci.org/karma-runner/karma-ng-scenario.png?branch=master)](https://travis-ci.org/karma-runner/karma-ng-scenario)

> Adapter for the AngularJS Scenario Runner.

**If you are starting a new project, we recommend using [Protractor] for e2e testing AngularJS projects.**

## Installation

The easiest way is to keep `karma-ng-scenario` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-ng-scenario": "~0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-ng-scenario --save-dev
```

## Configuration
Following code shows the default configuration...
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['ng-scenario'],

    files: [
      '*.js'
    ]
  });
};
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
[Protractor]: https://github.com/angular/protractor
