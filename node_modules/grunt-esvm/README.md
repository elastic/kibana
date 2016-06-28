# grunt-esvm

> Start, run, and update elasticsearch clusters from grunt.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-esvm --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-esvm');
```

## The "esvm" task

### Overview
In your project's Gruntfile, add a section named `esvm` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  esvm: {
    options: {
      // global esvm/libesvm options go here
    },
    clusterName: {
      options: {
        // clusterSpecific esvm/libesvm options go here
      }
    }
  }
});
```

### Options

Find a complete list of the options available at https://github.com/simianhacker/libesvm#new-clusteroptions-version

#### options.quiet
Type: `Boolean`
Default value: `false`

The only additional option that you can specify in grunt-esvm is `quiet`. This will prevent elasticsearch from logging to the console, and will simply start it up in the backgroun.

### Usage Examples

#### Start up 3 nodes running elasticsearch version 1.4

```js
grunt.initConfig({
  esvm: {
    options: {
      version: '1.4',
      nodes: 3,
      config: {
        cluster: {
          name: 'My Test Cluster'
        }
      }
    }
  }
});
```
