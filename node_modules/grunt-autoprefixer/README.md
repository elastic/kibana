# grunt-autoprefixer
[![Build Status](https://travis-ci.org/nDmitry/grunt-autoprefixer.png?branch=master)](https://travis-ci.org/nDmitry/grunt-autoprefixer)
[![Dependency Status](https://david-dm.org/nDmitry/grunt-autoprefixer.png)](https://david-dm.org/nDmitry/grunt-autoprefixer)
[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

> [Autoprefixer](https://github.com/postcss/autoprefixer) parses CSS and adds vendor-prefixed CSS properties using the [Can I Use](http://caniuse.com/) database.

## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-autoprefixer --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-autoprefixer');
```

## The "autoprefixer" task

### Overview
In your project's Gruntfile, add a section named `autoprefixer` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  autoprefixer: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### options.browsers
Type: `Array`
Default value: `['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1']`

You can specify browsers actual for your project:

```js
options: {
  browsers: ['last 2 version', 'ie 8', 'ie 9']
}
```

[Read more](https://github.com/postcss/autoprefixer#browsers).

#### options.cascade
Type: `Boolean`
Default value: `true`

Pass `false` to disable ‘cascade’ indentation. Read more [here](https://github.com/postcss/autoprefixer#visual-cascade).

#### options.diff
Type: `Boolean|String`
Default value: `false`

Set it to `true` if you want to get an output patch file:

```js
options: {
  diff: true // or 'custom/path/to/file.css.patch'
}
```
Also you can specify a path where to save this file. More examples in [Gruntfile](https://github.com/nDmitry/grunt-autoprefixer/blob/master/Gruntfile.js).

#### options.map
Type: `Boolean|Object`
Default value: `false`

If the `map` option isn't defined or is set to `false`, Autoprefixer will neither create nor update a sourcemap.

If `true` is specified, Autoprefixer will try to find a sourcemap from a previous compilation step using an annotation comment (e.g. from Sass) and create a new sourcemap based on the found one (or just create a new sourcemap). The created sourcemap can be either a separate file or an inlined map depending on what the previous sourcemap was.

You can gain more control over sourcemap generation by setting an object to the `map` option:

* `prev` (string or `false`): a path to a directory where a previous sourcemap is (e.g. `path/`). By default, Autoprefixer will try to find a previous sourcemap using a path from the annotation comment (or using the annotation comment itself if the map is inlined). You can also set this option to `false` to delete the previous sourcemap.
* `inline` (boolean): whether a sourcemap will be inlined or not. By default, it will be the same as a previous sourcemap or a separate file.
* `annotation` (boolean or string): set this option to `true` or `false` to enable or disable annotation comments. You can also overwrite an output sourcemap path using this option, e.g. `path/file.css.map` (by default, Autoprefixer will save your sourcemap to a directory where you save CSS). This option requires `inline` to be `false` or undefined.
* `sourceContent` (boolean): whether original contents (e.g. Sass sources) will be included to a sourcemap. By default, Autoprefixer will add contents only if a previous sourcemap have them.

#### options.silent
Type: `Boolean`
Default value: `false`

If the `silent` option is enabled, logging to the stdout will be suppressed.

```js
options: {
  silent: true
}
```

### Usage Examples

```js
grunt.initConfig({

  autoprefixer: {

    options: {
      // Task-specific options go here.
    },

    // prefix the specified file
    single_file: {
      options: {
        // Target-specific options go here.
      },
      src: 'src/css/file.css',
      dest: 'dest/css/file.css'
    },

    // prefix all files
    multiple_files: {
      expand: true,
      flatten: true,
      src: 'src/css/*.css', // -> src/css/file1.css, src/css/file2.css
      dest: 'dest/css/' // -> dest/css/file1.css, dest/css/file2.css
    },

    // if you have specified only the `src` param, the destination will be set automatically,
    // so source files will be overwritten
    no_dest: {
      src: 'dest/css/file.css' // globbing is also possible here
    },

    diff: {
        options: {
            diff: true
        },
        src: 'src/css/file.css',
        dest: 'dest/css/file.css' // -> dest/css/file.css, dest/css/file.css.patch
    },

    sourcemap: {
        options: {
            map: true
        },
        src: 'src/css/file.css',
        dest: 'dest/css/file.css' // -> dest/css/file.css, dest/css/file.css.map
    },
  }

});
```

Check out project's [Gruntfile.js](https://github.com/nDmitry/grunt-autoprefixer/blob/master/Gruntfile.js) for more examples.

### Updating prefixes database

```
$ npm update caniuse-db
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).
