# grunt-run

> Invite external commands into your grunt process with three tasks `run`, `wait` and `stop`.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-run --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-run');
```

## The "run" task

### Overview
In your project's Gruntfile, add a section named `run` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  run: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      cmd: 'executable',
      args: [
        'arg1',
        'arg2'
      ]
    }
  }
})
```

### Src/files/etc

Since this task doesn't operate on "files" it also doesn't use the standard src/files options. Instead, specify a `cmd:` and `args:` key to your test's config (see examples). `cmd:` defaults to `"node"`.

If you would like to specify your command as a single string, usefull for specifying multiple commands in one task, use the `exec:` key


### Options

#### options.wait
Type: `Boolean`
Default value: `true`

Should this task wait until the script exits before finishing? If you set this to false because you want to start a service of some sort before running another task, you can override this setting by passing the "keepalive" argument to the task call.

Example:
```sh
# start a testing instance of Elasticsearch and run some tests, `wait: false`
$ grunt run:es mocha:test

# override `wait` to keep Elasticsearch running
$ grunt run:es:keepalive
```

#### options.cwd
Type: `String`
Default value: `process.cwd()`

Should we change the working directory for the command runs in?

#### options.quiet
Type: `Boolean`, `Infinity`
Default value: `false`

Set to `true` to ignore stdout from the process, `Infinity` to ignore stderr as well (opts.failOnError will still work)

#### options.ready
Type: `RegExp`, `Number`, or `false`
Default value: 1000

If we are **not** waiting for the process to complete, then how do we know the process is ready?

A RegExp will test the lines from stdout and stderr and complete the task once the test succeeds, a Number will just set a timeout, and anything else will complete the task on nextTick

#### options.failOnError
Type: `Boolean`
Default value: `false`

If the process outputs anything on stderr then the process will be killed. If wait is `true` it will cause the task to fail as well.

#### options.passArgs
Type: `Array`
Default value: `[]`

Before running the command, look for these options using [grunt.option()](http://gruntjs.com/api/grunt.option#grunt.option). The syntax supported for specifying command line args in grunt is `--option1=myValue`.

### Usage Examples

#### Default
Want to just run some command line tool? With this config calling `grunt run:tool` will run that tool.

```js
grunt.initConfig({
  run: {
    tool: {
      cmd: './some-bash-script',
    }
  }
});

grunt.loadNpmTasks('grunt-run');
```

#### Multiple scripts
Want to run a few commands. With this config calling `grunt run:commands` will run them.

```js
grunt.initConfig({
  run: {
    commands: {
      exec: './some-bash-script && ./some-other-script',
    }
  }
});

grunt.loadNpmTasks('grunt-run');
```

#### `wait`ing
In this example, we are starting a small server that will serve our mocha tests to a browser. We will then open that page in the browser and tell grunt to wait until the process is exited, which probably won't happen so the process will just run until the user ends the process manually.

```js
grunt.initConfig({
  run: {
    integration_server: {
      options: {
        wait: false
      },
      // cmd: "node", // but that's the default
      args: [
        'test/integration_server.js'
      ]
    }
  },
  // https://github.com/jsoverson/grunt-open
  open: {
    integration_suite: {
      path: 'http://localhost:8888',
      app: 'Google Chrome'
    }

  }
});

grunt.loadNpmTasks('grunt-run');
grunt.loadNpmTasks('grunt-open');

grunt.registerTask('test', [
  'run:integration_server',
  'open:integration_tests',
  'wait:integration_server'
]);
```

#### `stop`ing
We can do something similar using grunt-mocha to run the tests inside phantomjs, but instead of waiting for the process we will just stop it once mocha is done.

```js
grunt.initConfig({
  run: {
    integration_server: {
      options: {
        wait: false
      },
      args: [
        'test/integration_server.js'
      ]
    }
  },
  // https://github.com/kmiyashiro/grunt-mocha
  mocha: {
    integration_suite: {
      urls: 'http://localhost:8888',
      app: 'Google Chrome'
    }
  }
});

grunt.loadNpmTasks('grunt-run');
grunt.loadNpmTasks('grunt-mocha');

grunt.registerTask('test', [
  'run:integration_server',
  'mocha:integration_suite',
  'stop:integration_server'
]);
```

#### passing args
When you execute a command, sometimes you want to modify the script form the call to grunt.

```js
grunt.initConfig({
  run: {
    server: {
      args: ['./server.js'],
      options: {
        passArgs: [
          'port'
        ]
      }
    }
  }
})
```

Then you can specify a `--port` option when calling grunt and it will be sent to the other process.

```
$ grunt run:server --port=8888
# calls "node ./server.js --port=8888"
```

## Contributing
Please lint and test your code with the included jshint config, or just run `grunt`.
