# rcfinder

[![Travis CI](https://travis-ci.org/spenceralger/rcfinder.svg)](https://travis-ci.org/spenceralger/rcfinder)

**This module provides the file lookup logic for the generally more useful [rcloader](https://www.npmjs.org/package/rcloader) package**.

Find a config file (like .jshintrc) by walking up from a specific directory.

Custom logic can be implemented for loading your config files, and calls to
the file system are cached so that you can find files relative to every file
in a project without making a ton of unnecessary calls.

## install
```js
npm install rcfinder
```

## Use
Create an instance of the RcFinder class, passing it the name of your config file and an object specifying other options.

```js
var RcFinder = require('rcfinder');
var rcFinder = new RcFinder('.jshintrc', {});
```

Then you can use the finder to look up the proper config file for a directory.
```js
// get the closet .jshintc file for this file
var config = rcFinder.find(__dirname);
```

If you want to use async file system calls, just specify a callback to find.
```js
rcFinder.find(__dirname, function (err, config) {

});
```

## Config
When creating an instance of the RcFinder class, you can specify options to dictate how the class behaves.
### config.loader
A function to call that will load a given path. Once the path for a config file is determined, this will be called with that path as it's only argument and it should return a proper value.

The default loader is:
```js
function loader(path) {
  return JSON.parse(fs.readFileSync(path));
}
```

To make your loader async, simply ask for second argument which will be set to a node-style callback. You can also ask for a simple async JSON loader by setting `loader:` equal to `'async'`.

NOTE:  You must call `.find()` with a callback if your loader is async.