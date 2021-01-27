# kbn-tinymath

kbn-tinymath is a tiny arithmetic and function evaluator for simple numbers and arrays. Named properties can be accessed from an optional scope parameter.
It's available as an expression function called `math` in Canvas, and the grammar/AST structure is available
for use by Kibana plugins that want to use math.

See [Function Documentation](/docs/functions.md) for details on built-in functions available in Tinymath.

```javascript
const { evaluate } = require('@kbn/tinymath');

// Simple math
evaluate('10 + 20'); // 30
evaluate('round(3.141592)') // 3

// Named properties
evaluate('foo + 20', {foo: 5}); // 25

// Arrays
evaluate('bar + 20', {bar: [1, 2, 3]}); // [21, 22, 23]
evaluate('bar + baz', {bar: [1, 2, 3], baz: [4, 5, 6]}); // [5, 7, 9]
evaluate('multiply(bar, baz) / 10', {bar: [1, 2, 3], baz: [4, 5, 6]}); // [0.4, 1, 1.8]
```

### Adding Functions

Functions can be injected, and built in function overwritten, via the 3rd argument to `evaluate`:

```javascript
const { evaluate } = require('@kbn/tinymath');

evaluate('plustwo(foo)', {foo: 5}, {
    plustwo: function(a) {
        return a + 2;
    }
}); // 7
```

### Parsing

You can get to the parsed AST by importing `parse`

```javascript
const { parse } = require('@kbn/tinymath');

parse('1 + random()')
/*
{
   "name": "add",
   "args": [
      1,
      {
         "name": "random",
         "args": []
      }
   ]
}
*/
```

#### Notes

* Floating point operations have the normal Javascript limitations

### Building kbn-tinymath

This package is rebuilt when running `yarn kbn bootstrap`, but can also be build directly
using `yarn build` from the `packages/kbn-tinymath` directory.
### Running tests

To test `@kbn/tinymath` from Kibana, run `yarn run jest --watch packages/kbn-tinymath` from
the top level of Kibana.
