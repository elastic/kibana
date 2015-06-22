# grunt-contrib-compass v0.6.0 [![Build Status](https://travis-ci.org/gruntjs/grunt-contrib-compass.png?branch=master)](https://travis-ci.org/gruntjs/grunt-contrib-compass)

> Compile Sass to CSS using Compass



## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-contrib-compass --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-contrib-compass');
```




## Compass task
_Run this task with the `grunt compass` command._

[Compass](http://compass-style.org/) is an open-source authoring framework for the [Sass](http://sass-lang.com/) css preprocessor. It helps you build stylesheets faster with a huge library of Sass mixins and functions, advanced tools for spriting, and workflow improvements including file based Sass configuration and a simple pattern for building and using Compass extensions.

This task requires you to have [Ruby](http://www.ruby-lang.org/en/downloads/), [Sass](http://sass-lang.com/tutorial.html), and [Compass](http://compass-style.org/install/) >=0.12.2 installed. If you're on OS X or Linux you probably already have Ruby installed; test with `ruby -v` in your terminal. When you've confirmed you have Ruby installed, run `gem update --system && gem install compass` to install Compass and Sass.

Compass operates on a folder level. Because of this you don't specify any src/dest, but instead define the `sassDir` and `cssDir` options.

### Options

Compass doesn't expose all of its [options][config] through the CLI, which this task makes use of. If you need an option not mentioned below you can either specify a path to a config.rb file in the `config` option or embed it directly into the `raw` option. Options defined in your Gruntfile will override those specified in your config.rb or `raw` property. `config` and `raw` are mutually exclusive.

#### config

Type: `String`  
Default: same path as your Gruntfile

Specify the location of the Compass [configuration file][config] explicitly.

#### raw

Type: `String`

String form of the Compass [configuration file][config].

#### basePath

Type: `String`

The the path Compass will run from. Defaults to the same path as your Gruntfile.

#### banner

Type: `String`

Prepend the specified string to the output file. Useful for licensing
information. **Note:** This only works in combination with the `specify` option
and can conflict with sourcemap generation.

#### app

Type: `String`  
Default: `stand_alone`

Tell compass what kind of application it is integrating with. Can be `stand_alone` or `rails`.

#### sassDir

Type: `String`

The source directory where you keep your Sass stylesheets.

#### cssDir

Type: `String`

The target directory where you keep your CSS stylesheets.

#### specify

Type: `String|Array`

Lets you specify which files you want to compile. Useful if you don't want to compile the whole folder. Globbing supported. Ignores filenames starting with underscore. Files must be in the directory you specified in `sassDir`.

#### imagesDir

Type: `String`

The directory where you keep your images.

#### javascriptsDir

Type: `String`

The directory where you keep your JavaScript files.

#### fontsDir

Type: `String`

The directory where you keep your fonts.

#### environment

Type: `String`  
Default: `development`

Use sensible defaults for your current environment. Can be: `development` or `production`

#### outputStyle

Type: `String`

CSS output mode. Can be: `nested`, `expanded`, `compact`, `compressed`.

#### relativeAssets

Type: `Boolean`

Make Compass asset helpers generate relative urls to assets.

#### noLineComments

Type: `Boolean`

Disable line comments.

#### httpPath

Type: `String`  
Default: `/`

The path to the project when running within the web server.

#### cssPath

Type: `String`

The directory where the css stylesheets are kept. It is relative to the `projectPath`. Defaults to "stylesheets".

#### httpStylesheetsPath

Type: `String`  
Default: `httpPath + "/" + cssDir`

The full http path to stylesheets on the web server.

#### sassPath

Type: `String`  
Default: `sass`

The directory where the sass stylesheets are kept. It is relative to the `projectPath`.

#### imagesPath

Type: `String`  
Default: `images`

The directory where the images are kept. It is relative to the projectPath.

#### httpImagesPath

Type: `String`  
Default: `httpPath + "/" + imagesDir`

The full http path to images on the web server.

#### generatedImagesDir

Type: `String`  
Default: value of `imagesDir`

The directory where generated images are kept. It is relative to the `projectPath`.

#### generatedImagesPath

Type: `String`  
Default: value of `projectPath/generatedImagesDir`

The full path to where generated images are kept.

#### httpGeneratedImagesPath

Type: `String`  
Default: `httpPath + "/" + generatedImagesDir`

The full http path to generated images on the web server.

#### javascriptsPath

Type: `String`  
Default: `projectPath/javascriptsDir`

The full path to where javascripts are kept.

#### httpJavascriptsPath

Type: `String`  
Default: `httpPath + "/" + javascriptsDir`

The full http path to javascripts on the web server.

#### fontsPath

Type: `String`  
Default: `projectPath/fontsDir`

The full path to where font files are kept.

#### httpFontsPath

Type: `String`

The full http path to font files on the web server.

#### httpFontsDir

Type: `String`

The relative http path to font files on the web server.

#### extensionsPath

Type: `String`  
Default: `project_root/extensions`

The full http path to the ad-hoc extensions folder on the web server. This is used to access compass plugins that have been installed directly to the project (e.g. through [Bower](https://github.com/bower/bower)) instead of globally as gems. *Only Compass >=0.12.2*

#### extensionsDir

Type: `String`

The relative http path to the ad-hoc extensions folder on the web server. *Only Compass >=0.12.2*

#### assetCacheBuster

Type: `Boolean`  
Default: `true`

If set to `false`, this disables the default asset cache buster.

#### require

Type: `String|Array`

Require the given Ruby library before running commands. This is used to access Compass plugins without having a project configuration file.

#### load

Type: `String|Array`

Load the framework or extensions found in the specified directory.

#### loadAll

Type: `String|Array`

Load all the frameworks or extensions found in the specified directory.

#### importPath

Type: `String|Array`

Makes files under the specified folder findable by Sass's @import directive.

#### debugInfo

Type: `Boolean`

Causes the line number and file where a selector is defined to be emitted into the compiled CSS in a format that can be understood by the browser. Automatically disabled when using `outputStyle: 'compressed'`.

#### quiet

Type: `Boolean`

Quiet mode.

#### trace

Type: `Boolean`

Show a full stacktrace on error.

#### force

Type: `Boolean`

Allows Compass to overwrite existing files.

#### dryRun

Type: `Boolean`

Dry Run. Tells you what it plans to do.

#### boring

Type: `Boolean`

Turn off colorized output.

#### bundleExec

Type: `Boolean`

Run `compass compile` with [bundle exec](http://gembundler.com/v1.3/man/bundle-exec.1.html): `bundle exec compass compile`.

#### clean

Type: `Boolean`

Remove generated files and the sass cache. Runs `compass clean` instead of `compass compile`.

#### watch

Type: `Boolean`

Runs `compass watch` instead of `compass compile`. This will use Compass' native watch command to listen for changes to Sass files and recompile your CSS on changes. While much faster than running `compass compile` each time you want to compile your Sass, Compass becomes a blocking task. This means that if you would like to use it in conjunction with another blocking task, such as `watch`, you will need to use it in conjunction with a paralleling task such as [grunt-concurrent](https://github.com/sindresorhus/grunt-concurrent).


[config]: http://compass-style.org/help/tutorials/configuration-reference/

### Usage Examples

#### Example config

```javascript
grunt.initConfig({
  compass: {                  // Task
    dist: {                   // Target
      options: {              // Target options
        sassDir: 'sass',
        cssDir: 'css',
        environment: 'production'
      }
    },
    dev: {                    // Another target
      options: {
        sassDir: 'sass',
        cssDir: 'css'
      }
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-compass');

grunt.registerTask('default', ['jshint', 'compass']);
```


#### Example usage


##### Use external config file

```javascript
grunt.initConfig({
  compass: {
    dist: {
      options: {
        config: 'config/config.rb'
      }
    }
  }
});
```

##### Override setting in external config file

```javascript
grunt.initConfig({
  compass: {
    dist: {
      options: {
        config: 'config/config.rb',  // css_dir = 'dev/css'
        cssDir: 'dist/css'
      }
    }
  }
});
```

##### Use `raw` option

```javascript
grunt.initConfig({
  compass: {
    dist: {
      options: {
        sassDir: 'sass',
        cssDir: 'css',
        raw: 'preferred_syntax = :sass\n' // Use `raw` since it's not directly available
      }
    }
  }
});
```


## Release History

 * 2013-10-04   v0.6.0   Add `watch` option. Fix Compass errors not propagating.
 * 2013-08-08   v0.5.0   Add `assetCacheBuster` option.
 * 2013-07-28   v0.4.1   Fix `banner` option with `.css.scss` files.
 * 2013-07-19   v0.4.0   Add `banner` option. Show compilation time.
 * 2013-06-24   v0.3.0   Add `extensionDir` and `extensionPath` options. *Requires Compass >=0.12.2*.
 * 2013-04-11   v0.2.0   Add `clean` option. Expose `raw` options as Grunt options. Fix detection of `Nothing to compile` situation.
 * 2013-02-27   v0.1.3   Fixes bundleExec.
 * 2013-02-17   v0.1.2   Ensure Gruntfile.js is included on npm.
 * 2013-02-15   v0.1.1   First official release for Grunt 0.4.0.
 * 2013-02-05   v0.1.1rc8   Added new options: basePath specify, debugInfo.
 * 2013-01-25   v0.1.1rc7   Updating grunt/gruntplugin dependencies to rc7. Changing in-development grunt/gruntplugin dependency versions from tilde version ranges to specific versions.
 * 2013-01-10   v0.1.1rc5   Updating to work with grunt v0.4.0rc5.
 * 2012-10-22   v0.1.0   Initial release

---

Task submitted by [Sindre Sorhus](http://github.com/sindresorhus)

*This file was generated on Fri Oct 04 2013 21:03:14.*
