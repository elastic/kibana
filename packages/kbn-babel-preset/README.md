# @kbn/babel-preset

This package contains the shared bits of babel config that we use for transpiling our source code to code compatible with Node.JS and the various [browsers we support](https://www.elastic.co/support/matrix#matrix_browsers).

## usage

To use our presets add the following to the devDependencies section of your package.json:

```
"@kbn/babel-preset": "1.0.0",
```

Then run `yarn kbn bootstrap` to properly link the package into your plugin/package.

Finally, add either `@kbn/babel-preset/node_preset` or `@kbn/babel-preset/webpack_preset` to your babel config.

`@kbn/babel-preset/node_preset` is usually placed in a [`babel.config.js` file](https://babeljs.io/docs/en/configuration#babelconfigjs).

`@kbn/babel-preset/webpack_preset` is usually placed directly in your `webpack` configuration.

***NOTE:*** If you're transpiling code that will be run in both the browser and node you must transpile your code twice, once for each target. Take a look at the build tasks for `@kbn/i18n` to see how that can look.