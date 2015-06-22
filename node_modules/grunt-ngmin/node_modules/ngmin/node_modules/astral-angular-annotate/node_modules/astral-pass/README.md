# Astral Pass

Pass helper for [Astral](https://github.com/btford/astral-pass) that simplifies traversal.

## Example

Below is a simple example.

```javascript
var myPass = require('astral-pass')();

myPass.name = 'myPass';
myPass.prereqs = [ /* other pass names here */ ];

myPass.
  when({
    // ... AST chunk
  }).
  when(function (chunk, info) {
    // return true or false
  }).
  do(function (chunk, info) {

  });
```

## More Complicated Passes

You can introduce more complicated behavior by composing passes.
This is done by modifying a pass's `prereqs` property.

```javascript
var astralPass = require('astral-pass');

// p1 needs some info to do its transformations

var p1 = astralPass();
p1.name = 'myPass';
p1.prereqs = [ 'p2' ];

p1.
  when( ... ).
  do( ... );

// p2 gathers the info for p1

var p2 = astralPass();
p2.name = 'myPass';

p2.
  when( ... ).
  do( ... );

```

I recommend namespacing passes with `:`.

## License
MIT
