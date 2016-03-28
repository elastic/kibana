# auto-preload-rjscommon-deps-loader

Simple loader function that causes a source file using require.js' commonjs syntax to have it's deps hoisted to the outer scope, so that it behaves like it does in require.js.

To use, simply add this module to the loaders for the specific files you want to wrap.

```
...
module: {
  loaders: [
    ...
    { test: /\/src\/.+\.js$/, loader: 'auto-preload-rjscommon-deps' }
    ...
  ]
}
...
```

NOTE: files containing `define(function(require` somewhere will be modified, and at this time all require calls are hoisted and duplicated.

## todo
 - [x] always load every dep before calling factory passed to define()
 - [ ] use parser plugins rather than regexp
 - [ ] only preload requires that are not a the top level of the module
 - [ ] only preload modules actually within the define factory
 - [ ] convert to use `define([deps], factory)` syntax