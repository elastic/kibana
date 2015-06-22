# time-grunt [![Build Status](https://secure.travis-ci.org/sindresorhus/time-grunt.png?branch=master)](http://travis-ci.org/sindresorhus/time-grunt) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

> Displays the execution time of [grunt](http://gruntjs.com) tasks

![screenshot](screenshot.png)


## Install

Install with [npm](https://npmjs.org/package/time-grunt)

```
npm install --save time-grunt
```


## Example

```js
// Gruntfile.js
module.exports = function (grunt) {
	// require it at the top and pass in the grunt instance
	require('time-grunt')(grunt);

	grunt.initConfig();
}
```

## Clean layout

Tasks that take less than 1% of the total time are hidden to reduce clutter.

Run grunt with `grunt --verbose` to see all tasks.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
