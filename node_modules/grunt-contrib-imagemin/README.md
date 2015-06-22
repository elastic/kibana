# grunt-contrib-imagemin v0.2.1 [![Build Status](https://travis-ci.org/gruntjs/grunt-contrib-imagemin.png?branch=master)](https://travis-ci.org/gruntjs/grunt-contrib-imagemin)

> Minify PNG and JPEG images



## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-contrib-imagemin --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-contrib-imagemin');
```




## Imagemin task
_Run this task with the `grunt imagemin` command._

Task targets, files and options may be specified according to the grunt [Configuring tasks](http://gruntjs.com/configuring-tasks) guide.

Minify images using [OptiPNG](http://optipng.sourceforge.net), [pngquant](http://pngquant.org), [jpegtran](http://jpegclub.org/jpegtran/) and [gifsicle](http://www.lcdf.org/gifsicle).

Images will be cached and only minified again if they change.

### Options

Options will only apply to the relevant files, so you don't need separate targets for png/jpg.


#### optimizationLevel *(png only)*

Type: `Number`
Default: `7`

Select optimization level between `0` and `7`.

> The optimization level 0 enables a set of optimization operations that require minimal effort. There will be no changes to image attributes like bit depth or color type, and no recompression of existing IDAT datastreams. The optimization level 1 enables a single IDAT compression trial. The trial chosen is what. OptiPNG thinks it’s probably the most effective. The optimization levels 2 and higher enable multiple IDAT compression trials; the higher the level, the more trials.

Level and trials:

1. 1 trial
2. 8 trials
3. 16 trials
4. 24 trials
5. 48 trials
6. 120 trials
7. 240 trials


#### progressive *(jpg only)*

Type: `Boolean`
Default: `true`

Lossless conversion to progressive.


#### interlaced *(gif only)*

Type: `Boolean`
Default: `true`

Interlace gif for progressive rendering.


#### pngquant

Type: `Boolean`
Default: `true`

Whether to enable pngquant compression.

> pngquant is a command-line utility for converting 24/32-bit PNG images to paletted (8-bit) PNGs. The conversion reduces file sizes significantly (often as much as 70%) and preserves full alpha transparency.

#### Example config

You can either map your files statically or [dynamically](https://github.com/gruntjs/grunt/wiki/Configuring-tasks#building-the-files-object-dynamically).

```javascript
grunt.initConfig({
  imagemin: {                          // Task
    static: {                          // Target
      options: {                       // Target options
        optimizationLevel: 3
      },
      files: {                         // Dictionary of files
        'dist/img.png': 'src/img.png', // 'destination': 'source'
        'dist/img.jpg': 'src/img.jpg',
        'dist/img.gif': 'src/img.gif'
      }
    },
    dynamic: {                         // Another target
      files: [{
        expand: true,                  // Enable dynamic expansion
        cwd: 'src/',                   // Src matches are relative to this path
        src: ['**/*.{png,jpg,gif}'],   // Actual patterns to match
        dest: 'dist/'                  // Destination path prefix
      }]
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-imagemin');
grunt.registerTask('default', ['imagemin']);
```


## Release History

 * 2013-09-09   v0.3.0   Add `interlace` option for gif files.
 * 2013-08-16   v0.2.0   Add `gifsicle` and `pngquant`. Cache images so only changed images are optimized. Default `optimizationLevel` to `7` and `progressive` to `true`.
 * 2013-04-10   v0.1.4   Fix exception when running in verbose mode.
 * 2013-04-05   v0.1.3   Fix OptiPNG not being able to overwrite file. Allow overwriting src when dest/src is the same. Limit to 10 concurrent optimizations.
 * 2013-02-22   v0.1.2   Fix OptiPNG not working on some systems. Prevent OptiPNG from producing .bak files.
 * 2013-02-15   v0.1.1   First official release for Grunt 0.4.0.
 * 2013-01-30   v0.1.1rc8   Fix task not creating destination folders
 * 2013-01-30   v0.1.1rc7   Updating to work with grunt v0.4.0rc7. Switching to this.files api.
 * 2012-11-01   v0.1.0   Initial release.

---

Task submitted by [Sindre Sorhus](http://github.com/sindresorhus)

*This file was generated on Mon Sep 09 2013 15:50:49.*
