# grunt-usemin [![Build Status](https://secure.travis-ci.org/yeoman/grunt-usemin.svg?branch=master)](http://travis-ci.org/yeoman/grunt-usemin)

> Replaces references from non-optimized scripts, stylesheets and other assets to their optimized version within a set of HTML files (or any templates/views).

**[Maintainer wanted](https://github.com/yeoman/grunt-usemin/issues/313)**


## Getting Started
If you haven't used [grunt][] before, be sure to check out the [Getting Started][] guide, as it explains how to create a [gruntfile][Getting Started] as well as install and use grunt plugins. Once you're familiar with that process, install this plugin with this command:

```shell
npm install grunt-usemin --save-dev
```

[grunt]: http://gruntjs.com/
[Getting Started]: http://gruntjs.com/getting-started

## Tasks

`usemin` replaces the references of scripts, stylesheets and other assets within HTML files dynamically with optimized versions of them. To do this `usemin` exports 2 built-in tasks called `useminPrepare` and `usemin` and utilizes a couple of other Grunt plugins for the optimization process. `usemin` does this by generating the subtasks for these Grunt plugins dynamically.

The built-in tasks of `usemin`:
* `useminPrepare` prepares the configuration to transform specific blocks in the scrutinized file into a single line, targeting an optimized version of the files. This is done by generating subtasks called `generated` for every optimization steps handled by the Grunt plugins listed below.
* `usemin` replaces the blocks by the file they reference, and replaces all references to assets by their revisioned version if it is found on the disk. This target modifies the files it is working on.

Grunt plugins which `usemin` can use to optimize files:
* [`concat`](https://github.com/gruntjs/grunt-contrib-concat) concatenates files (usually JS or CSS).
* [`uglify`](https://github.com/gruntjs/grunt-contrib-uglify) minifies JS files.
* [`cssmin`](https://github.com/gruntjs/grunt-contrib-cssmin) minifies CSS files.
* [`filerev`](https://github.com/yeoman/grunt-filerev) revisions static assets through a file content hash.

**Important**: _You still need to manually install and load these dependencies_.

In a typical `usemin` setup you launch `useminPrepare` first, then call every optimization step you want through their `generated` subtask and call `usemin` in the end. It could look like this:

```js
// simple build task
grunt.registerTask('build', [
  'useminPrepare',
  'concat:generated',
  'cssmin:generated',
  'uglify:generated',
  'filerev',
  'usemin'
]);
```

## The useminPrepare task

`useminPrepare` task updates the grunt configuration to apply a configured transformation flow to tagged files (i.e. blocks).
By default the transformation flow is composed of `concat` and `uglifyjs` for JS files, but it can be configured.

### Blocks
Blocks are expressed as:

```html
<!-- build:<type>(alternate search path) <path> -->
... HTML Markup, list of script / link tags.
<!-- endbuild -->
```

* **type**: can be `js`, `css` or a custom type with a [block replacement function](#blockreplacements) defined
 * If another type, the block will be ignored.  Useful for "development only" blocks that won't appear in your build
* **alternate search path**: (optional) By default the input files are relative to the treated file. Alternate search path allows one to change that
* **path**: the file path of the optimized file, the target output

An example of this in completed form can be seen below:

```html
<!-- build:js js/app.js -->
<script src="js/app.js"></script>
<script src="js/controllers/thing-controller.js"></script>
<script src="js/models/thing-model.js"></script>
<script src="js/views/thing-view.js"></script>
<!-- endbuild -->
```

### Transformation flow

The transformation flow is made of sequential steps: each of the steps transform the file, and useminPrepare will modify the configuration in order for the described steps to be correctly performed.

By default the flow is: `concat -> uglifyjs`.
Additionally to the flow, at the end, some postprocessors can be launched to further alter the configuration.

Let's have an example, using the default flow (we're just going to look at the steps), `app` for input dir, `dist` for output dir,  and the following block:

```html
<!-- build:js js/app.js -->
<script src="js/app.js"></script>
<script src="js/controllers/thing-controller.js"></script>
<script src="js/models/thing-model.js"></script>
<script src="js/views/thing-view.js"></script>
<!-- endbuild -->
```
The produced configuration will look like:

```js
{
  concat: {
    generated: {
      files: [
        {
          dest: '.tmp/concat/js/app.js',
          src: [
            'app/js/app.js',
            'app/js/controllers/thing-controller.js',
            'app/js/models/thing-model.js',
            'app/js/views/thing-view.js'
          ]
        }
      ]
    }
  },
  uglify: {
    generated: {
      files: [
        {
          dest: 'dist/js/app.js',
          src: [ '.tmp/concat/js/app.js' ]
        }
      ]
    }
  }
}
```

### Directories

Internally, the task parses your HTML markup to find each of these blocks, and initializes the corresponding Grunt config for the concat / uglify tasks when `type=js`, the concat / cssmin tasks when `type=css`.

One doesn't need to specify a concat/uglify/cssmin configuration anymore.

It uses only one target: `html`, with a list of the concerned files. For example, in your `Gruntfile.js`:

By default, it will consider the directory where the looked-at file is located as the 'root' filesystem. Each relative path (for example to a javascript file) will be resolved from this path. Same goes for the absolute ones.
If you need to change the 'root' dir, use the `root` option (see below).

```js
useminPrepare: {
  html: 'index.html'
}
```

Targets can also be configured using the grunt src-dest files syntax http://gruntjs.com/configuring-tasks#files, e.g.

```js
useminPrepare: {
  foo: {
    src: ['index.html', 'another.html']
  },
  bar: {
    src: 'index.html'
  }
}
```

### Options

### dest

Type: 'string'  
Default: `nil`

Base directory where the transformed files should be output.

### staging

Type: 'string'  
Default: `.tmp`

Base directory where the temporary files should be output (e.g. concatenated files).

### root

Type: 'string' or 'Array'  
Default: `nil`

The root directory from which your files will be resolved.

### flow

Type: 'object'  
Default: `{ steps: { js: ['concat', 'uglifyjs'], css: ['concat', 'cssmin'] }, post: {} }`

This allow you to configure the workflow, either on a per-target basis, or for all the targets.
You can change the `steps` or the post-processors (`post`) separately.

For example:

* to change the `js` `steps` and `post` for the target `html`:

```js
useminPrepare: {
  html: 'index.html',
  options: {
    flow: {
      html: {
        steps: {
          js: ['uglifyjs']
        },
        post: {}
      }
    }
  }
}
```

* to change the `js` `steps` and `post` for all targets:

```js
useminPrepare: {
  html: 'index.html',
  options: {
    flow: {
      steps: {
        js: ['uglifyjs']
      },
      post: {}
    }
  }
}
```

* to customize the generated configuration via post-processors:

```js
useminPrepare: {
  html: 'index.html',
  options: {
    flow: {
      steps: {
        js: ['uglifyjs']
      },
      post: {
        js: [{
          name: 'uglifyjs',
          createConfig: function (context, block) {
            var generated = context.options.generated;
            generated.options = {
              foo: 'bar'
            };
          }
        }]
      }
    }
  }
}
```

The given steps or post-processors may be specified as strings (for the default steps and post-processors), or as an object (for the user-defined ones).

#### User-defined steps and post-processors

User-defined steps and post-processors must have 2 attributes:

* `name`: name of the `Gruntfile` attribute that holds the corresponding config
* `createConfig` which is a 2 arguments function ( a `context` and the treated `block`)

For an example of steps/post-processors, you can have a look at `concat` and `uglifyjs` in the `lib/config` directory of this repository.

##### `createConfig`

The `createConfig` function is responsible for creating (or updating) the configuration associated to the current step/post-processor.
It takes 2 arguments ( a `context` and the treated `block`), and returns a configuration object.

###### `context`
The `context` object represent the current context the step/post-processor is running in. As the step/post-processor is a step of a flow, it must be listed in the input files and directory it must write a configuration for, potentially the already existing configuration. It must also indicate to the other steps/post-processor which files it will output in which directory. All this information is held by the `context` object.
Attributes:

* `inDir`: the directory where the `input` file for the step/post-processors will be
* `inFiles`: the list of input file to take care of
* `outDir`: where the files created by the step/post-processors will be
* `outFiles`: the files that are going to be created
* `last`: whether or not we're the last step of the flow
* `options`: options of the `Gruntfile.js` for this step (e.g. if the step is named `foo`, holds configuration of the `Gruntfile.js` associated to the attribute `foo`)

###### `block`
The actual looked-at block, parsed an put in a structure.

Example:
The following block
```html
<!-- build:js scripts/site.js -->',
<script src="foo.js"></script>',
<script src="bar.js"></script>',
<script src="baz.js"></script>',
<!-- endbuild -->'
```

is parsed as, and given to `createConfig` as:

```js
var block = {
  type: 'js',
  dest: 'scripts/site.js',
  src: [
    'foo.js',
    'bar.js',
    'baz.js'
  ],
  raw: [
    '    <!-- build:js scripts/site.js -->',
    '    <script src="foo.js"></script>',
    '    <script src="bar.js"></script>',
    '    <script src="baz.js"></script>',
    '    <!-- endbuild -->'
  ]
};
```

## The usemin task

The `usemin` task has 2 actions:

* First it replaces all the blocks with a single "summary" line, pointing to a file creating by the transformation flow.
* Then it looks for references to assets (i.e. images, scripts, ...), and tries to replace them with their revved version if it can find one on disk

### Finding assets

By default `usemin` will look for a map object created by [grunt-filerev](https://github.com/yeoman/grunt-filerev), located in `grunt.filerev.summary`. If it does not find it it will revert to disk lookup which is longer.

Note that by using the `options.revmap` (see below), you can furnish a map object.

### On directories

When `usemin` tries to replace referenced assets with their revved version it has to look at a collection of directories (asset search paths): for each of the directories of this collection it will look at the below tree, and try to find the revved version.
This asset search directories collection is by default set to the location of the file that is scrutinized but can be modified (see Options below).

#### Example 1: file `dist/html/index.html` has the following content:

```html
<link rel="stylesheet" href="styles/main.css">
<img src="../images/test.png">
```
By default `usemin` will look under `dist/html` for revved versions of:

* `styles/main.css`: a revved version of `main.css` will be looked at under the `dist/html/styles` directory. For example a file `dist/html/styles/main.1234.css` will match (although `dist/html/main.1234.css` won't: the path of the referenced file is important)
* `../images/test.png`: it basically means that a revved version of `test.png` will be looked for under the `dist/images` directory

#### Example 2: file `dist/html/index.html` has the following content:

```html
<link rel="stylesheet" href="/styles/main.css">
<img src="/images/test.png">
```
By default `usemin` will look under `dist/html` for revved versions of `styles/main.css` and `images/test.png`. Now let's suppose our assets are scattered in `dist/assets`. By changing the asset search path list to `['dist/assets']`, the revved versions of the files will be searched for under `dist/assets` (and thus, for example, `dist/assets/images/test.875487.png` and `dist/assets/styles/main.98090.css`) will be found.

### Options

#### assetsDirs

Type: 'Array'  
Default: Single item array set to the value of the directory where the currently looked at file is.

List of directories where we should start to look for revved version of the assets referenced in the currently looked at file.

Example:
```js
usemin: {
  html: 'build/index.html',
  options: {
    assetsDirs: ['foo/bar', 'bar']
  }
}
```

#### patterns

Type: 'Object'  
Default: Empty

Allows for user defined pattern to replace reference to files. For example, let's suppose that you want to replace
all references to `'image.png'` in your Javascript files by the revved version of `image.png` found below the directory `images`.
By specifying something along the lines of:

```js
usemin: {
  js: '*.js',
  options: {
    assetsDirs: 'images',
    patterns: {
      js: [
        [/(image\.png)/, 'Replacing reference to image.png']
      ]
    }
  }
}
```

So in short:

* key in pattern should match the target (e.g `js` key for the target `js`)
* Each pattern is an array of arrays. These arrays are composed of 4 items (last 2 are optional):
  * First one if the regexp to use. The first group is the one that is supposed to represent the file
    reference to replace
  * Second one is a logging string
    * FIXME
    * FIXME

#### blockReplacements

Type: 'Object'  
Default: `{ css: function (block) { ... }, js: function (block) { ... } }`

This lets you define how blocks get their content replaced. Useful to have block types other that `css` and `js`.

* Object key matches a block type
* Value is the replacement function for that block type.
  * The replacement function gets called with a single argument: a [block](#block) object.
  * Must return a `String`, the "summary" line that will replace the block content.

For example, to create a `less` block you could define its replacement function like this:

```js
usemin: {
  html: index.html,
  options: {
    blockReplacements: {
      less: function (block) {
          return '<link rel="stylesheet" href="' + block.dest + '">';
      }
    }
  }
}
```

#### revmap

Type: 'String'  
Default: Empty

Indicate the location of a map file, as produced by `grunt-filerev` for example. This map file is a simple JSON file, holding an object
which attributes are the original file and associated value is the transformed file. For example:

```js
{
  "foo.png": "foo.1234.png"
}
```
This map will be used instead of looking for file on the disk.

## On directories
The main difference to be kept in mind, regarding directories and tasks, is that for `useminPrepare`, the directories needs to indicate the input,
transient and output path needed to output the right configuration for the processors pipeline,
whereas in the case of `usemin` it only reflects the output paths, as all the needed assets should have
been output to the destination dir (either transformed or just copied)

### useminPrepare
`useminPrepare` is trying to prepare the right configuration for the pipeline of actions that are going to be
applied on the blocks (for example concatenation and uglify-cation). As such it needs to have the input
directory, temporary directories (staging) and destination directory.
The files referenced in the block are either absolute or relative (`/images/foo.png` or `../../images/foo.png`).
Absolute files references are looked in a given set of search path (input), which by default is set
to the directory where the html/css file examined is located (can be overridden per block, or more
generally through `root` option).
Relative files references are also looked at from location of the examined file, unless stated otherwise.


### usemin
`usemin` target replaces references to images, scripts, css, ... in the furnished files (html, css, ...).
These references may be either absolute (i.e. `/images/foo.png`) or relative (i.e. `image/foo.png`
or `../images/foo.png`).
When the reference is absolute a set of asset search paths should be looked at under the
destination directory (for example, using the previous example, and `searchpath`
equal to `['assets']`, `usemin` would try to find either a revved version of the image
of the image below the `assets` directory: for example `dest/assets/images/foo.1223443.png`).
When the reference is relative, by default the referenced item is looked in the path
relative *to the current file location* in the destination directory (e.g. with the
preceding example, if the file is `build/bar/index.html`, then transformed `index.html`
will be in `dist/bar`, and `usemin` will look for `dist/bar/../images/foo.32323.png`).


## Use cases

### Simple one

```
|
+- app
|   +- index.html
|   +- assets
|       +- js
|          +- foo.js
|          +- bar.js
+- dist

```

We want to optimize `foo.js` and `bar.js` into `optimized.js`, referenced using relative path. `index.html` should contain the following block:

```html
<!-- build:js assets/js/optimized.js -->
<script src="assets/js/foo.js"></script>
<script src="assets/js/bar.js"></script>
<!-- endbuild -->
```

We want our files to be generated in the `dist` directory.

By using the following `useminPrepare` config:

```js
{
  useminPrepare: {
    html: 'app/index.html',
    options: {
      dest: 'dist'
    }
  }
}
```

This will, on the fly, generate the following configuration:

```js
{
  concat:
  {
    '.tmp/concat/assets/js/optimized.js': [
      'app/assets/js/foo.js',
      'app/assets/js/bar.js'
    ]
  },

  uglify:
  {
    'dist/assets/js/optimized.js': ['.tmp/concat/assets/js/optimized.js']
  }
}
```

### HTML file and asset files in sibling directories
```
app
|
+- html
|   +- index.html
+- assets
|   +- js
|      +- foo.js
|      +- bar.js
+- dist

```

We want to optimize `foo.js` and `bar.js` into `optimized.js`, referenced using absolute path. `index.html` should contain the following block:

```html
<!-- build:js /assets/js/optimized.js -->
<script src="/assets/js/foo.js"></script>
<script src="/assets/js/bar.js"></script>
<!-- endbuild -->
```

We want our files to be generated in the `dist` directory.

By using the following `useminPrepare` config:

```js
{
  useminPrepare: {
    html: 'html/index.html',
    options: {
      root: 'app',
      dest: 'dist'
    }
  }
}
```

This will, on the fly, generate the following configuration:

```js
{
  concat:
  {
    '.tmp/concat/assets/js/optimized.js': [
      'app/assets/js/foo.js',
      'app/assets/js/bar.js'
    ]
  },

  uglify:
  {
    'dist/assets/js/optimized.js': ['.tmp/concat/assets/js/optimized.js']
  }
}
```

## License

[BSD license](http://opensource.org/licenses/bsd-license.php) and copyright Google
