# Usage examples

## Wildcards
In this example, running `grunt jshint:all` (or `grunt jshint` because `jshint` is a [multi task](http://gruntjs.com/configuring-tasks#task-configuration-and-targets)) will lint the project's Gruntfile as well as all JavaScript files in the `lib` and `test` directories and their subdirectores, using the default JSHint options.

```js
// Project configuration.
grunt.initConfig({
  jshint: {
    all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js']
  }
});
```

## Linting before and after concatenating
In this example, running `grunt jshint` will lint both the "beforeconcat" set and "afterconcat" sets of files. This is not ideal, because `dist/output.js` may get linted before it gets created via the [grunt-contrib-concat plugin](https://github.com/gruntjs/grunt-contrib-concat) `concat` task.

In this case, you should lint the "beforeconcat" files first, then concat, then lint the "afterconcat" files, by running `grunt jshint:beforeconcat concat jshint:afterconcat`.

```js
// Project configuration.
grunt.initConfig({
  concat: {
    dist: {
      src: ['src/foo.js', 'src/bar.js'],
      dest: 'dist/output.js'
    }
  },
  jshint: {
    beforeconcat: ['src/foo.js', 'src/bar.js'],
    afterconcat: ['dist/output.js']
  }
});
```

## Specifying JSHint options and globals

In this example, custom JSHint options are specified. Note that when `grunt jshint:uses_defaults` is run, those files are linted using the default options, but when `grunt jshint:with_overrides` is run, those files are linted using _merged_ task/target options.

```js
// Project configuration.
grunt.initConfig({
  jshint: {
    options: {
      curly: true,
      eqeqeq: true,
      eqnull: true,
      browser: true,
      globals: {
        jQuery: true
      },
    },
    uses_defaults: ['dir1/**/*.js', 'dir2/**/*.js'],
    with_overrides: {
      options: {
        curly: false,
        undef: true,
      },
      files: {
        src: ['dir3/**/*.js', 'dir4/**/*.js']
      },
    }
  },
});
```

## Ignoring specific warnings

If you would like to ignore a specific warning:

```shell
[L24:C9] W015: Expected '}' to have an indentation at 11 instead at 9.
```

You can toggle it by prepending `-` to the warning id as an option:

```js
grunt.initConfig({
  jshint: {
    ignore_warning: {
      options: {
        '-W015': true,
      },
      src: ['**/*.js'],
    },
  },
});
```

## Ignoring specific files

Occasionally application files and third party libraries share the same directory.  To exclude third party code, but include all current and future application files, use a glob for `files` and specifically exclude libraries using `ignores`.  In this example, the jQuery file is matched by the glob but subsequently ignored when JSHint does its analysis.

```js
grunt.initConfig({
    jshint: {
        files: ['js/*.js'],
        options: {
            ignores: ['js/jquery.js']
        }
    }
});
```
