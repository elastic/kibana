# babel-loader
  > Babel is a compiler for writing next generation JavaScript.

  This package allows transpiling JavaScript files using [Babel](https://github.com/babel/babel) and [webpack](https://github.com/webpack/webpack).

  __Notes:__ Issues with the output should be reported on the babel [issue tracker](https://github.com/babel/babel/issues);

## Installation

```bash
npm install babel-loader --save-dev
```

__Note:__ [npm](https://npmjs.com) will deprecate [peerDependencies](https://github.com/npm/npm/issues/6565) on the next major release, so required dependencies like babel-core and webpack will have to be installed manually.

## Usage

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

  Within your webpack configuration object, you'll need to add the babel-loader to the list of modules, like so:

  ```javascript
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel'
    }
  ]
}
  ```

### Options

See the `babel` [options](http://babeljs.io/docs/usage/options/).

You can pass options to the loader by writting them as a [query string](https://github.com/webpack/loader-utils):

  ```javascript
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel?optional[]=runtime&stage=0'
    }
  ]
}
  ```

  or by using the query property:

  ```javascript
module: {
  loaders: [
    {
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        optional: ['runtime'],
        stage: 0
      }
    }
  ]
}
  ```

  This loader also supports the following loader-specific option:

  * `cacheDirectory`: When set, the given directory will be used to cache the results of the loader. Future webpack builds will attempt to read from the cache to avoid needing to run the potentially expensive Babel recompilation process on each run. The default value (`loader: 'babel-loader?cacheDirectory'`) will cause the loader to use the default OS temporary file directory.

  * `cacheIdentifier`: When set, it will add the given identifier to the cached files. This can be used to force cache busting if the identifier changes. By default the identifier is composed by the babel-core's version, the babel-loader's version and the .babelrc file if it exists.


  __Note:__ The `sourceMap` option is ignored, instead sourceMaps are automatically enabled when webpack is configured to use them (via the `devtool` config option).

## Troubleshooting

### babel-loader is slow!

  Make sure you are transforming as few files as possible. Because you are probably
  matching `/\.js$/`, you might be transforming the `node_modules` folder or other unwanted
  source.

  See the `exclude` option in the `loaders` config as documented above.

### babel is injecting helpers into each file and bloating my code!

  babel uses very small helpers for common functions such as `_extend`. By default
  this will be added to every file that requires it.

  You can instead require the babel runtime as a separate module to avoid the duplication.

  The following configuration disables automatic per-file runtime injection in babel, instead
  requiring `babel-runtime` and making all helper references use it.

  See the [docs](https://babeljs.io/docs/usage/runtime) for more information.

  **NOTE:** You must run `npm install babel-runtime --save` to include this in your project.

```javascript
loaders: [
  // the optional 'runtime' transformer tells babel to require the runtime
  // instead of inlining it.
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel?optional[]=runtime'
  }
]
```

### using `cacheDirectory` fails with ENOENT Error

If using cacheDirectory results in an error similar to the following:

```
ERROR in ./frontend/src/main.jsx
Module build failed: Error: ENOENT, open 'true/350c59cae6b7bce3bb58c8240147581bfdc9cccc.json.gzip'
 @ multi app
```
(notice the `true/` in the filepath)

That means that most likely, you're not setting the options correctly, and you're doing something similar to:

```javascript
loaders: [
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel?cacheDirectory=true'
  }
]
```

That's not the correct way of setting boolean values. You should do instead:

```javascript
loaders: [
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel-loader?cacheDirectory'
  }
]
```

or use the [query](https://webpack.github.io/docs/using-loaders.html#query-parameters) property:

```javascript
loaders: [
  // the optional 'runtime' transformer tells babel to require the runtime
  // instead of inlining it.
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel-loader',
    query: {
      cacheDirectory: true
    }
  }
]
```


### custom polyfills (e.g. Promise library)

Since Babel includes a polyfill that includes a custom [regenerator runtime](https://github.com/facebook/regenerator/blob/master/runtime.js) and [core.js](https://github.com/zloirock/core-js), the following usual shimming method using `webpack.ProvidePlugin` will not work:

```javascript
// ...
        new webpack.ProvidePlugin({
            'Promise': 'bluebird'
        }),
// ...
```

The following approach will not work either:

```javascript
require('babel-runtime/core-js/promise').default = require('bluebird');

var promise = new Promise;
```

which outputs to (using `runtime`):

```javascript
'use strict';

var _Promise = require('babel-runtime/core-js/promise')['default'];

require('babel-runtime/core-js/promise')['default'] = require('bluebird');

var promise = new _Promise();
```

The previous `Promise` library is referenced and used before it is overridden.

One approach is to have a "bootstrap" step in your application that would first override the default globals before your application:

```javascript
// bootstrap.js

require('babel-runtime/core-js/promise').default = require('bluebird');

// ...

require('./app');
```

## [License](http://couto.mit-license.org/)
