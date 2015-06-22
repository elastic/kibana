# grunt-rev [![Build Status](https://travis-ci.org/cbas/grunt-rev.png)](https://travis-ci.org/cbas/grunt-rev)

> Static file asset revisioning through content hashing

## Getting Started
_If you haven't used [grunt][] before, be sure to check out the [Getting Started][] guide._

From the same directory as your project's [Gruntfile][Getting Started] and [package.json][], install this plugin with the following command:

```bash
npm install grunt-rev --save-dev
```

Once that's done, add this line to your project's Gruntfile:

```js
grunt.loadNpmTasks('grunt-rev');
```

If the plugin has been installed correctly, running `grunt --help` at the command line should list the newly-installed plugin's task or tasks. In addition, the plugin should be listed in package.json as a `devDependency`, which ensures that it will be installed whenever the `npm install` command is run.

[grunt]: http://gruntjs.com/
[Getting Started]: https://github.com/gruntjs/grunt/blob/devel/docs/getting_started.md
[package.json]: https://npmjs.org/doc/json.html

## The "rev" task

Use the **rev** task together with [yeoman/grunt-usemin](https://github.com/yeoman/grunt-usemin) for cache busting of static files in your app. This allows them to be cached forever by the browser.

### Overview
In your project's Gruntfile, add a section named `rev` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  rev: {
    options: {
      algorithm: 'md5',
      length: 8
    },
    assets: {
      files: [{
        src: [
          'img/**/*.{jpg,jpeg,gif,png}',
          'fonts/**/*.{eot,svg,ttf,woff}'
        ]
      }]
    }
  },
})
```

### Options

#### options.algorithm
Type: `String`
Default value: `'md5'`

`algorithm` is dependent on the available algorithms supported by the version of OpenSSL on the platform. Examples are `'sha1'`, `'md5'`, `'sha256'`, `'sha512'`, etc. On recent releases, `openssl list-message-digest-algorithms` will display the available digest algorithms.

#### options.length
Type: `Number`
Default value: `8`

The number of characters of the file content hash to prefix the file name with.

### Usage Examples

#### Basic Asset Revving
This will rename `app.js` and `app.css` with an 8 character long hash prefix. For example `js/9becff3a.app.js` and `css/ae35dd05.app.css`. The hash value depends on the file contents.

```js
grunt.initConfig({
  rev: {
    files: {
      src: ['scripts/app.js', 'css/app.css']
    }
  }
})
```

#### Custom Options
Change the algorithm or length to style the generated asset file names. Note that the `usemin` companion task requires at least one anycase hexadecimal character to prefix the file name.

```js
grunt.initConfig({
  rev: {
    options: {
      algorithm: 'sha1',
      length: 4
    },
    files: {
      src: ['**/*.{js,css,png,jpg}']
    }
  }
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][].

## Release History
_(Nothing yet)_
