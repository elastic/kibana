[![NPM version](https://badge.fury.io/js/gruntify-eslint.svg)](http://badge.fury.io/js/gruntify-eslint)

gruntify-eslint
====================

Grunt plugin for Eslint

## Getting Started

If you haven't used [grunt][] before, be sure to check out the [Getting Started][] guide, as it explains how to create a [gruntfile][Getting Started] as well as install and use grunt plugins. Once you're familiar with that process, install this plugin with this command:

```bash
$ npm install --save-dev gruntify-eslint
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks("gruntify-eslint");
```

[grunt]: http://gruntjs.com
[Getting Started]: https://github.com/gruntjs/grunt/wiki/Getting-started


## Documentation

See the grunt [docs](https://github.com/gruntjs/grunt/wiki) on how to [configure tasks](https://github.com/gruntjs/grunt/wiki/Configuring-tasks) and more advanced usage.

### Example

```js
grunt.initConfig({
	eslint: {					
		src: ["app.js"]
	}
});

grunt.loadNpmTasks("gruntify-eslint");
grunt.registerTask("default", ["eslint"]);
```

### Example with custom config and rules

```js
grunt.initConfig({
	eslint: {					
		options: {
			configFile: "conf/eslint.json",
			rulePaths: ["conf/rules"]
		},
		src: ["app.js"]
	}
});

grunt.loadNpmTasks("gruntify-eslint");
grunt.registerTask("default", ["eslint"]);
```

### Example with custom rules for node and browser files

```js
grunt.config.init({
  eslint: {
    nodeFiles: {
      src: ["server/**/*.js"],
      options: {
        configFile: "conf/eslint-node.json"
      }
    },

    browserFiles: {
      src: ["client/**/*.js"]
      options: {
        configFile: "conf/eslint-browser.json"
      }
    }
  }
});

grunt.loadNpmTasks("gruntify-eslint");
grunt.registerTask("default", ["eslint"]);
```

### Example with silent option

```js
grunt.initConfig({
	eslint: {						
		options: {
			silent: true
		},
		src: ["app.js"]		
	}
});

grunt.loadNpmTasks("gruntify-eslint");
grunt.registerTask("default", ["eslint"]);
```

  
### [Options](http://eslint.org/docs/developer-guide/nodejs-api#cliengine)

#### configFile

Type: `path::String`

#### format

Type: `String`
Default: `'stylish'`

Name of a [built-in formatter](https://github.com/nzakas/eslint/tree/master/lib/formatters) or path to a custom one.

#### silent

Type: `Boolean`

Whether the grunt task would fail on error or will it always pass irrespective of the results.
i.e. to supress the failure.
This option is not passed to the eslint api.

#### callback

Type: `Function`

You can specify a call back function which would be called when eslint is done processing the files. The first argument passed in would be the results object.
This option is not passed to the eslint api.

** More information about options: [Eslint options]

[Eslint options]: http://eslint.org/docs/developer-guide/nodejs-api#cliengine
