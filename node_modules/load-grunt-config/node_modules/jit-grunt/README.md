# jit-grunt 0.9.1 [![NPM version](https://badge.fury.io/js/jit-grunt.png)](http://badge.fury.io/js/jit-grunt) [![Build Status](https://secure.travis-ci.org/shootaroo/jit-grunt.png?branch=master)](http://travis-ci.org/shootaroo/jit-grunt) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

A JIT(Just In Time) plugin loader for Grunt.  
Load time of Grunt does not slow down even if there are many plugins.


### Before
```js
grunt.loadNpmTasks('assemble');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-connect');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-csslint');
grunt.loadNpmTasks('grunt-contrib-less');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-newer');
grunt.loadNpmTasks('grunt-wget');
...
```

```
$ grunt assemble
...
Execution Time (2014-01-14 02:52:59 UTC)
loading tasks     5.7s  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ 84%
assemble:compile  1.1s  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ 16%
Total 6.8s
```

umm...


### After
```js
require('jit-grunt')(grunt);
```

```
$ grunt assemble
...
Execution Time (2014-01-14 02:53:34 UTC)
loading tasks     111ms  ▇▇▇▇▇▇▇▇▇ 8%
loading assemble  221ms  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ 16%
assemble:compile   1.1s  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ 77%
Total 1.4s
```

Have a pleasant Grunt life!


## Install
```
npm install jit-grunt --save-dev
```


## Usage

Removes `grunt.loadNpmTasks`, then add the `require('jit-grunt')(grunt)` instead. Only it.

```js
module.exports = function (grunt) {
  require('jit-grunt')(grunt);

  grunt.initConfig({
    ...
  });

  grunt.registerTask('default', [...]);
}
```
Will automatically search for the plugin from the task name.
Search in the following order:

1. node_modules/grunt-contrib-`task-name`
2. node_modules/grunt-`task-name`
3. node_modules/`task-name`

```
clean           -> node_modules/grunt-contrib-clean
wget            -> node_modules/grunt-wget
mochaTest       -> node_modules/grunt-mocha-test
mocha_phantomjs -> node_modules/grunt-mocha-phantomjs
assemble        -> node_modules/assemble
```


### Static mappings
Second parameter is static mappings.  
It is used when there is a plugin that can not be resolved in the automatic mapping.

`taskname`: `grunt-plugin-name`

```js
require('jit-grunt')(grunt, {
  sprite: 'grunt-spritesmith',
  foo: '@abc/grunt-foo',        // for private modules.
  bar: 'custom/bar.js'          // for custom tasks.
});
```


### Options

#### pluginsRoot

Type: `String`  
Default: `'node_modules'`

Root directory of grunt plugins.

```js
require('jit-grunt')(grunt)({
  pluginsRoot: 'other/dir'
});
```

#### customTasksDir

Type: `String`  
Default: `null`

JIT Loading for custom tasks dir (replacement of [grunt.loadTasks]).

```js
require('jit-grunt')(grunt)({
  customTasksDir: 'custom/dir'
});
```

Search in the following order:

1. `custom/dir`/`taskname`.js
2. `custom/dir`/`taskname`.coffee

#### loadTasks

Alias to `customTasksDir`.


## Example

https://github.com/shootaroo/jit-grunt/tree/master/example


## Release History

- 2014-10-15   v0.9.0   Support parent directories of node_modules.
- 2014-08-07   v0.8.0   Support grunt.registerTask in plugin #19.
- 2014-08-07   v0.7.1   Fix log output.
- 2014-05-19   v0.7.0   Support custom task by CoffeeScript.
- 2014-05-08   v0.6.0   Add option customTasksDir and pluginsRoot.
- 2014-04-14   v0.5.0   Support static mappings for custom tasks.
- 2014-04-14   v0.4.2   Fix loadTasks path.
- 2014-04-09   v0.4.1   Revert path.resolve.
- 2014-04-09   v0.4.0   Add loadTasks option.
- 2014-03-17   v0.3.2   Fix grunt.loadTask bug.
- 2014-03-17   v0.3.1   Fix grunt.loadTask bug.
- 2014-03-17   v0.3.0   Support grunt.loadTasks.
- 2014-02-27   v0.2.3   Support task name of camelCase and snake_case.
- 2014-02-22   v0.2.2   Add plugin not found log.
- 2014-01-23   v0.2.1   Change log to verbose.
- 2014-01-13   v0.2.0   Load timing became JIT perfectly, and support time-grunt result.
- 2013-12-24   v0.1.2   Log colored.
- 2013-12-23   v0.1.1   Fix bug on grunt-contrib-concat.
- 2013-12-21   v0.1.0   Support auto mappings.
- 2013-12-20   v0.0.1   First release.


## License

The MIT License (MIT)

Copyright &copy; 2013 [Shotaro Tsubouchi](https://github.com/shootaroo)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


[grunt.loadTasks]:http://gruntjs.com/api/grunt#grunt.loadtasks
