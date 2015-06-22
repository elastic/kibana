#grunt-ngmin

Grunt plugin for pre-minifying Angular apps. Learn why this is awesome by reading up on the [ngmin](https://github.com/btford/ngmin) cli tool.

## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-ngmin --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-ngmin');
```

## ngmin task
_Run this task with the `grunt ngmin` command._

Task targets, files and options may be specified according to the grunt [Configuring tasks](http://gruntjs.com/configuring-tasks) guide.

### Example

```js
ngmin: {
  controllers: {
    src: ['test/src/controllers/one.js'],
    dest: 'test/generated/controllers/one.js'
  },
  directives: {
    expand: true,
    cwd: 'test/src',
    src: ['directives/**/*.js'],
    dest: 'test/generated'
  }
},
```

##Running the Tests
Run `grunt test`.

## License
BSD