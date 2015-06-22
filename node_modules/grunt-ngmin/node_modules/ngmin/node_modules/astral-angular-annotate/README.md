# Astral Angular Annotator

A pass for [Astral](https://github.com/btford/astral) to generate [AngularJS](http://angularjs.org) [DI annotations](TODO: find docs) automatically.

For a tool CLI, see `[ngmin](TODO: link).

## Usage

Below is an example parsing, annotating, and generating JavaScript code. Note that this requires the `esprima`, `escodegen`, `astral`, and `astral-angular-annotator` npm packages.

```javascript
var esprima = require('esprima'),
  escodegen = require('escodegen'),
  astral = require('astral')();

// register angular annotator pass
require('astral-angular-annotator')(astral);

var inputCode = "angular.module('myMod').controller('FooCtrl', function ($scope) {" +
"  // ..." +
"});";

var ast = esprima.parse(inputCode, {
  tolerant: true
});

astral.run(ast);

var generatedCode = escodegen.generate(ast, {
  format: {
    indent: {
      style: '  '
    }
  }
});

console.log(generatedCode);

// logs:
//
// angular.module('myMod').controller('FooCtrl', ['$scope', function ($scope) {
//   // ...
// });

```

## API

You can also access each of the individual passes like this:

```

```

This might be handy for more fine-tuned control.

## License
MIT
