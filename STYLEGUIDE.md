This is a collection of style guides for Kibana projects. The include guides for the following:

- [JavaScript](style_guides/js_style_guide.md)
- [CSS](style_guides/css_style_guide.md)
- [HTML](style_guides/html_style_guide.md)
- [API](style_guides/api_style_guide.md)

# Kibana Style Guide

Things listed here are specific to Kibana and likely only apply to this project

## Share common utilities as lodash mixins

When creating a utility function, attach it as a lodash mixin.

Several already exist, and can be found in `src/kibana/utils/_mixins.js`

## Filenames

All filenames should use `snake_case` and *can* start with an underscore if the module is not intended to be used outside of its containing module.

*Right:*
  - `src/kibana/index_patterns/index_pattern.js`
  - `src/kibana/index_patterns/_field.js`

*Wrong:*
  - `src/kibana/IndexPatterns/IndexPattern.js`
  - `src/kibana/IndexPatterns/Field.js`

## Modules

Kibana uses WebPack, which supports many types of module definitions.

### CommonJS Syntax

Module dependencies should be written using CommonJS or ES2015 syntax:

*Right:*

```js
const _ = require('lodash');
module.exports = ...;
```

```js
import _ from 'lodash';
export default ...;
```

*Wrong:*

```js
define(['lodash'], function (_) {
  ...
});
```

## Angular Usage

Kibana is written in Angular, and uses several utility methods to make using Angular easier.

### Defining modules

Angular modules are defined using a custom require module named `ui/modules`. It is used as follows:

```js
var app = require('ui/modules').get('app/namespace');
```

`app` above is a reference to an Angular module, and can be used to define controllers, providers and anything else used in Angular. While you can use this module to create/get any module with ui/modules, we generally use the "kibana" module for everything.

### Private modules

A service called `Private` is available to load any function as an angular module without needing to define it as such. It is used as follows:

```js
app.controller('myController', function($scope, otherDeps, Private) {
  var ExternalClass = Private(require('path/to/some/class'));
  ...
});
```

*Use `Private` modules for everything except directives, filters, and controllers.*

### Promises

A more robust version of Angular's `$q` service is available as `Promise`. It can be used in the same way as `$q`, but it comes packaged with several utility methods that provide many of the same useful utilities as Bluebird.

```js
app.service('CustomService', function(Promise, otherDeps) {
  new Promise(function (resolve, reject) {
    ...
  });

  var promisedFunc = Promise.cast(someFunc);

  return Promise.resolve('value');
});
```

### Routes

Angular routes are defined using a custom require module named `routes` that remove much of the required boilerplate.

```js
require('ui/routes')
.when('/my/object/route/:id?', {
  // angular route code goes here
});
```
