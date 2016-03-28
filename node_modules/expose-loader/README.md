# expose loader for webpack

## Usage

``` javascript
require("expose?libraryName!./file.js");
// Exposes the exports for file.js to the global context on property "libraryName".
// In web browsers, window.libraryName is then available.
```

This line works to expose React to the web browser to enable the Chrome React devtools:

```
require("expose?React!react");
```

Thus, `window.React` is then available to the Chrome React devtools extension.

Alternately, you can set this in your config file:

```
module: {
  loaders: [
    { test: require.resolve("react"), loader: "expose?React" }
  ]
}
```

The `require.resolve` is a node.js call (unrelated to `require.resolve` in webpack
processing -- check the node.js docs instead). `require.resolve` gives you the
absolute path to the module ("/.../app/node_modules/react/react.js"). So the
expose only applies to the react module. And it's only exposed when used in the
bundle.


[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

## License

MIT (http://www.opensource.org/licenses/mit-license.php)
