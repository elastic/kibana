# grunt-newer

Configure [Grunt](http://gruntjs.com/) tasks to run with only those files modified since the last successful run.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [`gruntfile.js`](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-newer --save-dev
```

Once the plugin has been installed, it may be enabled inside your `gruntfile.js` with this line:

```js
grunt.loadNpmTasks('grunt-newer');
```

## The `newer` task

The `newer` task doesn't require any special configuration.  To use it, just add `newer` as the first argument when running other tasks.

For example, if you want to run [JSHint](https://npmjs.org/package/grunt-contrib-jshint) on only those files that have been modified since the last successful run, configure the `jshint` task as you would otherwise, and then register a task with `newer` at the front.

```js
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: 'src/**/*.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-newer');

  grunt.registerTask('lint', ['newer:jshint:all']);
```

With the above configuration, running `grunt lint` will configure your `jshint:all` task to use only files in the `src` config that have been modified since the last successful run of the same task.

Another example is to use the `newer` task in conjunction with `watch`.  For example, you might want to set up a watch to run a linter on all your `.js` files whenever any of them changes.  With the `newer` task, instead of re-running the linter on all files, you only need to run it on the files that changed.

```js
  var srcFiles = 'src/**/*.js';

  grunt.initConfig({
    jshint: {
      all: {
        src: srcFiles
      }
    },
    watch: {
      all: {
        files: srcFiles,
        tasks: ['newer:jshint:all']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-newer');

```

With the above configuration, running `grunt jshint watch` will first lint all your files with `jshint` and then set up a watch.  Whenever one of your source files changes, the `jshint` task will be run on just the modified file.


## The `any-newer` task

The `newer` task described above reconfigures the target task to run with only those files that have been modified since the last run.  This works well for tasks that don't generate new files (like linting).  When you have a task that generates destination files based on configured source files, you likely want to process all source files if any one of them has been modified since the last run.  The `any-newer` task serves this purpose.

For example, if you want to run [UglifyJS](https://npmjs.org/package/grunt-contrib-uglify) on all your source files only when one or more have been modified since the last run, configure the `uglify` task as you would otherwise, and then register a task with `any-newer` at the front.


```js
  grunt.initConfig({
    uglify: {
      all: {
        files: {
          'dest/app.min.js': 'src/**/*.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-newer');

  grunt.registerTask('minify', ['any-newer:uglify:all']);
```

With the above configuration, running `grunt minify` will only run the `uglify:all` task if one or more of the configured `src` files have been modified since the last successful run of the same task.

## Options for the `newer` and `any-newer` tasks

In most cases, you shouldn't need to add any special configuration for the `newer` or `any-newer` tasks.  Just `grunt.loadNpmTasks('grunt-newer')` and you can use the tasks.  The single option below is available if you need a custom configuration.

#### <a id="optionstimestamps">options.timestamps</a>
 * type: `string`
 * default: `node_modules/grunt-newer/.cache`

To keep track of timestamps for successful runs, the `newer` and `any-newer` tasks write to a cache directory.  The default is to use a `.cache` directory within the `grunt-newer` installation directory.  If you need timestamp info to be written to a different location, configure the task with a `timestamps` option.

Example use of the `timestamps` option:

```js
  grunt.initConfig({
    newer: {
      options: {
        timestamps: 'path/to/custom/cache/directory'
      }
    }
  });
```

## That's it

Please [submit an issue](https://github.com/tschaub/grunt-newer/issues) if you encounter any trouble.  Contributions or suggestions for improvements welcome!

[![Current Status](https://secure.travis-ci.org/tschaub/grunt-newer.png?branch=master)](https://travis-ci.org/tschaub/grunt-newer)
