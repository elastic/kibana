# ngmin
[![Build Status](https://travis-ci.org/btford/ngmin.png?branch=master)](https://travis-ci.org/btford/ngmin)

ngmin is an AngularJS application pre-minifier. The goal is ultimately to use this alongside yeoman and grunt to make developing and building Angular apps fast, easy, and fun.

## tl;dr
Turns this

```
angular.module('whatever').controller('MyCtrl', function ($scope, $http) { ... });
```

into

```
angular.module('whatever').controller('MyCtrl', ['$scope', '$http', function ($scope, $http) { ... }]);
```

so that minifiers can handle AngularJS's DI annotations and you can save a few keystrokes.

## Installation
Install via npm:
```bash
npm install -g ngmin
```

## Build Systems

- [grunt-ngmin](https://github.com/btford/grunt-ngmin)
- [gulp-ngmin](https://github.com/sindresorhus/gulp-ngmin)

## Asset Pipelines

### Ruby on Rails

`ngmin` is available for Rails via [`ngmin-rails`](http://rubygems.org/gems/ngmin-rails).

### Clojure Ring

`ngmin` is available for Clojure Ring via [`optimus-angular`](https://github.com/magnars/optimus-angular) as an [`Optimus`](https://github.com/magnars/optimus) asset middleware.

## CLI Usage

Ideally, you should concat all of your files, then run `ngmin` once on the concatenated file.

```bash
ngmin somefile.js somefile.annotate.js
```

From here, the annotated file(s) to a minifier.

`ngmin` also accepts stdio. The following is the same as above:

```bash
ngmin < somefile.js > somefile.annotate.js
```

## Conventions
`ngmin` does not currently attempt to be fully generalized, and might not work if you're too clever. If you follow these conventions, which are the same as what the AngularJS Yeoman generator defaults, you should be fine.

### Module Declaration

```javascript
// like this
angular.module('myModuleName', ['dependOnThisModule']);
```

### Controller Declaration

```javascript
// like this
angular.module('myModuleName').controller('MyCtrl', function ($scope) {
  // ...
});
```

### Service Declaration
This should work for all injectable APIs.

```javascript
// like this
angular.module('myModuleName').service('myService', function ($scope) {
  // ...
});
```

### Chaining
You can methods like this, and `ngmin` should still work fine:

```javascript
// like this
angular.module('myModuleName').
  service('myFirstService', function ($scope) {
    // ...
  }).
  service('mySecondService', function ($scope) {
    // ...
  });
```

This works with all injectable APIs.

### References
This is not the preferred way of dealing with modules, and thus support for it isn't completely comprehensive. Something like this will work:
```javascript
var myMod = angular.module('myMod', []);
myMod.service('myService', function ($scope) {
  // ...
});
```

But something like this will probably fail spectacularly:
```javascript
var myMod = angular.module('myMod', []);
var mod1, mod2, mod3;
mod1 = myMod;
mod3 = (function () {
  return mod2 = mod1;
}());
mod3.service('myService', function ($scope) {
  // ...
});
```

Please don't write code like the second example. :)

## Conceptual Overview
AngularJS's DI system inspects function parameters to determine what to inject:
```javascript
// angular knows to inject "myService" based on the parameter in "myFactory"
someModule.factory('myFactory', function (myService) {
  // ...
});
```
AngularJS does this for `Module#controller`, `Module#service`, `Module#factory`, etc. Check out the [developer guide on DI](http://docs.angularjs.org/guide/di) for more info.

JavaScript minifiers rename function parameters. The code above, when minified, might look like this:
```javascript
// the "myService" parameter has been renamed to "a" to save precious bytes
someModule.factory('myFactory', function (a) {
  // ...
});
```

To overcome this, AngularJS has a "minifier-safe inline" notation (see [Inline Annotation](http://docs.angularjs.org/guide/di) in the docs) that annotates `angular.controller`, `angular.service`, `angular.factory` with an array of dependencies' names as strings:
```javascript
// angular knows to inject "myService" based on the parameter in "myFactory"
someModule.factory('myFactory', ['myService', function (myService) {
  // ...
}]);
```

So with this notation, when minified, still includes the correct dependency names even if the function arguments are re-written:
```javascript
someModule.factory('myFactory', ['myService', function (a) {
  // minified variable "a" will represent "myService"
  // ...
}]);
```

Writing the "minifier-safe" version by hand is kind of annoying because you have to keep both the array of dependency names and function parameters in sync.

## License
MIT
