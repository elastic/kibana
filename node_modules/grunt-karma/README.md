# grunt-karma [![Build Status](https://travis-ci.org/karma-runner/grunt-karma.png?branch=master)](https://travis-ci.org/karma-runner/grunt-karma)

> Grunt plugin for [Karma](https://github.com/karma-runner/karma)

This current version `0.8.0` uses `karma@0.12.x`. For using older versions see the
old releases of grunt-karma.

## Getting Started
From the same directory as your project's Gruntfile and package.json, install
this plugin with the following command:

```bash
$ npm install grunt-karma --save-dev
```

Once that's done, add this line to your project's Gruntfile:

```js
grunt.loadNpmTasks('grunt-karma');
```

## Config
Inside your `Gruntfile.js` file, add a section named `karma`, containing
any number of configurations for running karma. You can either put your
config in a [karma config file] or leave it all in your Gruntfile (recommended).

### Here's an example that points to the config file:

```js
karma: {
  unit: {
    configFile: 'karma.conf.js'
  }
}
```

### Here's an example that puts the config in the Gruntfile:

```js
karma: {
  unit: {
    options: {
      files: ['test/**/*.js']
    }
  }
}
```

You can override any of the config file's settings by putting them
directly in the Gruntfile:

```js
karma: {
  unit: {
    configFile: 'karma.conf.js',
    runnerPort: 9999,
    singleRun: true,
    browsers: ['PhantomJS'],
    logLevel: 'ERROR'
  }
}
```

To change the `logLevel` in the grunt config file instead of the karma config, use one of the following strings:
`OFF`, `ERROR`, `WARN`, `INFO`, `DEBUG`

### Config with Grunt Template Strings in `files`

When using template strings in the `files` option, the results will flattened. Therefore, if you include a variable that includes an array, the array will be flattened before being passed to Karma.

Example:

```js
meta: {
  jsFiles: ['jquery.js','angular.js']
},
karma: {
  options: {
    files: ['<%= meta.jsFiles %>','angular-mocks.js','**/*-spec.js']
  }
}
```

## Sharing Configs
If you have multiple targets, it may be helpful to share common
configuration settings between them. Grunt-karma supports this by
using the `options` property:

```js
karma: {
  options: {
    configFile: 'karma.conf.js',
    runnerPort: 9999,
    browsers: ['Chrome', 'Firefox']
  },
  continuous: {
    singleRun: true,
    browsers: ['PhantomJS']
  },
  dev: {
    reporters: 'dots'
  }
}
```

In this example the `continuous` and `dev` targets will both use
the `configFile` and `runnerPort` specified in the `options`. But
the `continuous` target will override the browser setting to use
PhantomJS, and also run as a singleRun. The `dev` target will simply
change the reporter to dots.

## Running tests
There are three ways to run your tests with karma:

### Karma Server with Auto Runs on File Change
Setting the `autoWatch` option to true will instruct karma to start
a server and watch for changes to files, running tests automatically:

```js
karma: {
  unit: {
    configFile: 'karma.conf.js',
    autoWatch: true
  }
}
```
Now run `$ grunt karma`

### Karma Server with Grunt Watch
Many Grunt projects watch several types of files using [grunt-contrib-watch].
Config karma like usual (without the autoWatch option), and add
`background:true`:

```js
karma: {
  unit: {
    configFile: 'karma.conf.js',
    background: true
  }
}
```
The `background` option will tell grunt to run karma in a child process
so it doesn't block subsequent grunt tasks.

Config your `watch` task to run the karma task with the `:run` flag. For example:

```js
watch: {
  //run unit tests with karma (server needs to be already running)
  karma: {
    files: ['app/js/**/*.js', 'test/browser/**/*.js'],
    tasks: ['karma:unit:run'] //NOTE the :run flag
  }
},
```

In your terminal window run `$ grunt karma:unit:start watch`, which starts the
karma server and the watch task. Now when grunt watch detects a change to
one of your watched files, it will run the tests specified in the `unit`
target using the already running karma server. This is the preferred method
for development.

### Single Run
Keeping a browser window & karma server running during development is
productive, but not a good solution for build processes. For that reason karma
provides a "continuous integration" mode, which will launch the specified
browser(s), run the tests, and close the browser(s). It also supports running
tests in [PhantomJS], a headless webkit browser which is great for running tests as part of a build. To run tests in continous integration mode just add the `singleRun` option:

```js
karma: {
  unit: {
    configFile: 'config/karma.conf.js',
  },
  //continuous integration mode: run tests once in PhantomJS browser.
  continuous: {
    configFile: 'config/karma.conf.js',
    singleRun: true,
    browsers: ['PhantomJS']
  },
}
```

The build would then run `grunt karma:continuous` to start PhantomJS,
run tests, and close PhantomJS.

## Using additional client.args
You can pass arbitrary `client.args` through the commandline like this:

```bash
$ grunt karma:dev watch --grep=mypattern
```


## License
MIT License

[karma-config-file]: http://karma-runner.github.com/0.8/config/configuration-file.html
[grunt-contrib-watch]: https://github.com/gruntjs/grunt-contrib-watch
[PhantomJS]: http://phantomjs.org/
[karma-mocha]: https://github.com/karma-runner/karma-mocha
