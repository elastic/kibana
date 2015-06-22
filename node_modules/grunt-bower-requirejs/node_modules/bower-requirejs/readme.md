# bower-requirejs [![Build Status](https://secure.travis-ci.org/yeoman/bower-requirejs.svg?branch=master)](http://travis-ci.org/yeoman/bower-requirejs)

> Automagically wire-up installed Bower components into your RequireJS config


## Install

```sh
$ npm install --save bower-requirejs
```


## Usage

```
./node_modules/.bin/bower-requirejs -c path/to/config.js -e underscore -e jquery
```


## Options

```
-h, --help              # Print options and usage'
-v, --version           # Print the version number'
-c, --config            # Path to your RequireJS config file'
-e, --exclude           # Name of a dependency to be excluded from the process'
-b, --base-url          # Path which all dependencies will be relative to'
-t, --transitive        # Process transitive dependencies'
-d, --exclude-dev       # Exclude devDependencies'
```


## Using Bower Hooks

Bower >=v1.3.1 includes [hooks](https://github.com/bower/bower/blob/master/HOOKS.md) for `preinstall`, `postinstall` and `preuninstall` actions. To run grunt-bower-requirejs after every bower install, add a `scripts` block to your `.bowerrc`.

```
{
  "scripts": {
    "postinstall": "bower-requirejs -c path/to/config.js"
  }
}
```


## Things to remember

### Config file

If you do not already have a `config.js` file at the location specified by the `--config` option then one will be generated for you. A basic `config.js` file looks like this:

``` js
requirejs.config({
  shim: {},
  paths: {}
});
```

You still need to create a path for *your* js files. This tool will only create paths for third party libraries specified in `bower.json`.

``` js
requirejs.config({
  shim: {},
  paths: {
    myComponent: 'js/myComponent.js'  // make sure to add your components!
  }
});
```

The tool does not overwrite the config file, it just adds additional paths to it. So paths you add will be preserved. Keep in mind that if you change or remove one of your Bower dependencies after you've run the task, that path will still exist in the config file and you'll need to manually remove it.


### Transitive option

If the transitive option is set to ```true```, then transitive dependencies will be also added to the require config.

For example, say we explicitly have an entry in our bower config for module ```myTotallyCoolModule```, which depends on ```jQuery``` and ```underscore```. If the transitive option is set to ```true```, there will be config entries for ```myTotallyCoolModule```, ```jQuery```, and ```underscore```. Otherwise, if the transitive option is set to ```false```, there will only be a config entry for ```myTotallyCoolModule```.

Each transitive dependency is only included once, even if the dependency is used multiple times.

### exclude-dev option

If the `exclude-dev` option is set to ```true```, then dev-dependencies will not be added to the require config.


### RequireJS component

Although RequireJS does not provide a `bower.json` file, a path to `require.js` will still be created in your `rjsConfig` file. The path's name will be `requirejs`. If you are optimizing your scripts with `r.js` you can use this path to make sure RequireJS is included in your bundle.

## Package Support

If a dependency's `moduleType` is set to `node` in `bower.json` it will be treated as a [CommonJS Package](http://requirejs.org/docs/api.html#packages).

The following `bower.json` file:

``` js
{
  "name": "node-module-type-stub",
  "version": "0.0.1",
  "moduleType": ["node"],
  "main": "myMain.js"
}
```

Will generate this entry in your `config.js` file:

```
require.config({
  shim: {},
  packages: [
    {
      name: 'node-module-type-stub',
      main: 'myMain.js',
      location: 'bower_components/node-module-type-stub'
    }
  ],
  paths: {}
});
```

### Configuring location

By default, the task will set the package `location` to the root directory of the dependency. If the dependency includes a `location` property in its `bower.json`, then the location will be a combination of the root directory and the location dir.

For example, a bower.json like this:

``` js
{
  "name": "node-module-type-stub",
  "version": "0.0.1",
  "moduleType": ["node"],
  "main": "myMain.js",
  "location": "src"
}
```

Will generate this entry in your `config.js` file:

``` js
require.config({
  shim: {},
  packages: [
    {
      name: 'node-module-type-stub',
      main: 'myMain.js',
      location: 'bower_components/node-module-type-stub/src'
    }
  ],
  paths: {}
});
```

### Overriding the main file of a dependency

You can override the main file of a given dependency by specifying the `overrides.{dependency}.main` property
in your `bower.json` file:

```js
{  
  "overrides": {
     "jquery": {
       "main": "jquery.min.js"
     },
     "anima": {
       "main": "anima.min.js"
     }
   }
 }
```

> The file path is relative to the dependency folder

## Programmatic API

### bowerRequireJS(options, callback)

- `options` — An [options object](https://github.com/yeoman/bower-requirejs#options) containing optional config, baseUrl, and exclude options. The `config` option specifies an output file to which the generated require.js config will be written. If a require.js config file already exists at this location, the generated config will be merged into this file.
- `callback` — A callback to execute when the task is finished. This callback will receive an object that contains the require.js configuration generated from bower components. Note that this includes *only* config elements representing bower components.

You can use `bower-requirejs` directly in your app if you prefer to not rely on the binary.

```js
var bowerRequireJS = require('bower-requirejs');

var options = {
  config: 'scripts/config.js',
  exclude: ['underscore', 'jquery'],
  transitive: true
};

bowerRequireJS(options, function (rjsConfigFromBower) {
  // all done!
});
```


### parse(pkg, name, baseUrl)

- `pkg` — A package object returned from `bower list`
- `name` — The name of the package
- `baseUrl` — A baseUrl to use when generating the path

If you would like to just receive a paths object you can do so with the `parse` module. If your package does not contain a `bower.json` file, or if the `bower.json` does not contain a `main` attribute then the parse module will try to use the `primary` module to find a primary, top-level js file.

```js
var bower = require('bower');
var _ = require('lodash');
var parse = require('bower-requirejs/lib/parse');

var baseUrl = './';

bower.commands.list()
  .on('end', function (data) {
    _.forOwn(data.dependencies, function (pkg, name) {
      if (name == 'jquery') {
        var pathObj = parse(pkg, name, baseUrl);
      }
    });
  });
```

### primary(name, canonicalDir, opts)

- `name` — The package name
- `canonicalDir` — The canonicalDir for the package, either returned by `bower list` or passed in manually
- `opts` — Use the ```opts.extraSearchDirs``` to specify other dirs to search, relative to the canonicalDir. By default this is ```['dist']```.

If you just want to look for the js file in a bower component's top-level directory or 'dist' directory you can use the `primary` module. The `primary` module will exclude gruntfiles and `min.js` files. It will also check if `package.json` specifies a `main` js file.

```js
var primary = require('bower-requirejs/lib/primary');

var name = 'backbone';
var dep = { canonicalDir: './bower_components/backbone' };

var primaryJS = primary(name, dep);
// returns backbone.js
```

### buildConfig(bowerDependencyGraph, options)

- `bowerDependencyGraph` — A bower dependency graph, as returned by a call to `bower.commands.list`
- `options` — An object containing `baseUrl`, `exclude`, and `transitive` options, as described above.

This module can be used to generate a requireJs config elements from bower components.

```js
var buildConfig = require('bower-requirejs/lib/build-config');

bower.commands.list({})
.on('end', function (dependencyGraph) {
  var configElementsFromBower = buildConfig(dependencyGraph, {
    baseUrl : '/some/base/url',
    exclude: ['underscore', 'jquery'],
    transitive: true
  });
});
```

## Credit

[![Sindre Sorhus](http://gravatar.com/avatar/d36a92237c75c5337c17b60d90686bf9?s=144)](http://sindresorhus.com) | [![Rob Dodson](http://gravatar.com/avatar/95c3a3b33ea51545229c625bef42e343?s=144)](http://robdodson.me)
:---:|:---:
[Sindre Sorhus](http://sindresorhus.com) (creator) | [Rob Dodson](http://robdodson.me) (maintainer)


## License

[BSD license](http://opensource.org/licenses/bsd-license.php) and copyright Google
