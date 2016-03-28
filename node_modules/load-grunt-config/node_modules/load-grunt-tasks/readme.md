# load-grunt-tasks [![Build Status](https://travis-ci.org/sindresorhus/load-grunt-tasks.svg?branch=master)](https://travis-ci.org/sindresorhus/load-grunt-tasks)

> Load multiple grunt tasks using globbing patterns

Usually you would have to load each task one by one, which is unnecessarily cumbersome.

This module will read the `dependencies`/`devDependencies`/`peerDependencies`/`optionalDependencies` in your package.json and load grunt tasks that match the provided patterns.


#### Before

```js
grunt.loadNpmTasks('grunt-shell');
grunt.loadNpmTasks('grunt-sass');
grunt.loadNpmTasks('grunt-recess');
grunt.loadNpmTasks('grunt-sizediff');
grunt.loadNpmTasks('grunt-svgmin');
grunt.loadNpmTasks('grunt-styl');
grunt.loadNpmTasks('grunt-php');
grunt.loadNpmTasks('grunt-eslint');
grunt.loadNpmTasks('grunt-concurrent');
grunt.loadNpmTasks('grunt-bower-requirejs');
```

#### After

```js
require('load-grunt-tasks')(grunt);
```


## Install

```
$ npm install --save-dev load-grunt-tasks
```


## Usage

```js
// Gruntfile.js
module.exports = function (grunt) {
	// load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({});
	grunt.registerTask('default', []);
}
```


## Examples

### Load all grunt tasks

```js
require('load-grunt-tasks')(grunt);
```

Equivalent to:

```js
require('load-grunt-tasks')(grunt, {pattern: ['grunt-*', '@*/grunt-*']});
```

### Load all grunt-contrib tasks

```js
require('load-grunt-tasks')(grunt, {pattern: 'grunt-contrib-*'});
```

### Load all grunt-contrib tasks and another non-contrib task

```js
require('load-grunt-tasks')(grunt, {pattern: ['grunt-contrib-*', 'grunt-shell']});
```

### Load all grunt-contrib tasks excluding one

You can exclude tasks using the negate `!` globbing pattern:

```js
require('load-grunt-tasks')(grunt, {pattern: ['grunt-contrib-*', '!grunt-contrib-coffee']});
```

### Set custom path to package.json

```js
require('load-grunt-tasks')(grunt, {config: '../package'});
```

### Only load from `devDependencies`

```js
require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
```

### Only load from `devDependencies` and `dependencies`

```js
require('load-grunt-tasks')(grunt, {scope: ['devDependencies', 'dependencies']});
```

### All options in use

```js
require('load-grunt-tasks')(grunt, {
	pattern: 'grunt-contrib-*',
	config: '../package.json',
	scope: 'devDependencies'
});
```


## Options

### pattern

Type: `string`, `array`  
Default: `['grunt-*', '@*/grunt-*']` ([globbing pattern](https://github.com/isaacs/minimatch))

### config

Type: `string`, `object`  
Default: Path to nearest package.json

### scope

Type: `string`, `array`  
Default: `['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']`  
Values: `'dependencies'`, `'devDependencies'`, `'peerDependencies'`, `'optionalDependencies'`, `'bundledDependencies'`


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
