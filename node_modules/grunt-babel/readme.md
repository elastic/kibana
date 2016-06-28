# grunt-babel [![Build Status](https://travis-ci.org/babel/grunt-babel.svg?branch=master)](https://travis-ci.org/babel/grunt-babel)

> Turn ES6 code into vanilla ES5 with no runtime required using [babel](https://github.com/babel/babel)

*Issues with the output should be reported on the babel [issue tracker](https://github.com/babel/babel/issues).*


## Install

```
$ npm install --save-dev grunt-babel
```


## Usage

```js
require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

grunt.initConfig({
	babel: {
		options: {
			sourceMap: true
		},
		dist: {
			files: {
				'dist/app.js': 'src/app.js'
			}
		}
	}
});

grunt.registerTask('default', ['babel']);
```


## Options

See the `babel` [options](https://babeljs.io/docs/usage/options), except for `filename` which is handled for you.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
