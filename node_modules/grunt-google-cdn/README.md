# grunt-google-cdn [![Build Status](https://travis-ci.org/btford/grunt-google-cdn.png)](https://travis-ci.org/btford/grunt-google-cdn)
 Grunt task for replacing refs to resources on the [Google CDN](https://developers.google.com/speed/libraries/devguide)

## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-google-cdn
```

It manages dependencies using [Bower](http://bower.io/), be sure to have it installed, and a bower.json/component.json in your project.


Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-google-cdn');
```

Run this task with the `grunt cdnify` command.

### Configuration

Within your Gruntfile.js file, you need to specify the html directory that contains the html referencing your CDN files.

```js
cdnify: {
  dist: {
    html: ['app/*.html']
  }
}
```
You will need a valid bower.json/component.json file in your project, that has dependencies and a version listed accordingly

```json
{
  "name": "myAwesomeApp",
  "version": "0.0.1",
  "dependencies": {
    "rsvp": "*",
    "carve": ">=0.0.1",
    "es5-shim": "~2.0.8",
    "optimist" :  "0.2.x"
  }
```

If any updates are found, it will go through the files you specified, updating any references to those scripts.


## Release History

 * 2013-04-24   v0.1.4   removed the extra s in component.json
 * 2013-04-22   v0.1.3   Made 'components.json' configurable via bowerrc, added unstable AngularJS and jQuery 2.0.0
 * 2013-04-07   v0.1.2   update available AngularJS versions, add .jshintrc
 * 2013-02-24   v0.1.0   add support for versions, hositing to avoid conflicts with usemin
 * 2013-02-18   v0.0.1   Initial Commit

---

## License
BSD
