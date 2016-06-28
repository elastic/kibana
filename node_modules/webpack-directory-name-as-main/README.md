# webpack-directory-name-as-main

Teach webpack to use a file with the same name as the directory if that directory is required and it doesn't have an index.js file.

This allows you to write:

`require('lib/ReallyImportantModule')`

inorder to require:

`lib/ReallyImportantModule/ReallyImportantModule.js`


This module is designed to be used as strategy for a `webpack.ResolverPlugin` like so:
```js
var DirectoryNameAsMain = require('webpack-directory-name-as-main');
var webpackConfig = {
  entry: ...,

  plugins: [
    new webpack.ResolverPlugin([
      new DirectoryNameAsMain()
    ]),
    ...
  ]
};
```