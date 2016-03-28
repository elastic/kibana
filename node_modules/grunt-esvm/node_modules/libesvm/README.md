libesvm
==============

This is a library for managing Elasticsearch instances for testing and development environments. **It's not intended to be used in production (just don't)**. We uses it to download specific versions of Elasticsearch and start them up in our setup and tear down steps of our testing framework. It's also used for our esvm tool for managing our development enviroments.

## Installation

```
npm install libesvm
```

## new Cluster(options, version)

This will create a new instance of the cluster. The first object is the options object and the second argument is the version of the cluster.

#### Methods

* `Cluster.prototype.log(level, message)` - Creates a log message
* `Cluster.prototype.install(cb)`         - Installs the server based on the options passed to the cluster. (returns Promise)
* `Cluster.prototype.start(cb)`           - Starts the cluster. (returns Promise)
* `Cluster.prototype.shutdown(cb)`        - Shuts down the cluster. (returns Promise)
* `Cluster.prototype.installPlugins(cb)`  - Installs the plugins (returns Promise)

#### Options

* `version`   - The semver statment for the released version of Elasticsearch to install (This will override branch and binary).
* `branch`    - The nightly branch to install
* `binary`    - The path to the tarball to use. This can either be URL or file path.
* `directory` - The directory where everything is installed. If the directory doesn't exist it will be created.
* `plugins`   - The plugins to install. This should be an array of plugin install directives.
* `purge`     - Purge the data directory when starting the server (Default: false).
* `fresh`     - Remove the current copy before installing a new copy (Default: false).
* `nodes`     - The number of nodes to start. This can either be a number or an array of config objects (1 per node)
* `config`    - The config to start the server with.

#### Events

* `log` - Triggered when a log event is emitted. Almost all the types and levels are triggerd by the Elasticsaerch instance. The only special one is the `progress` type. When the progress type is emitted the log object itself is an Event emitter which has a `progress` event which will update upon the progress of the opperation. See the example below.

## Example

Here is an example of what you can do with this script (pulled from example.js)

```javascript
var libesvm     = require('libesvm');
var path        = require('path');
var clc         = require('cli-color');
var moment      = require('moment');
var _           = require('lodash');
var ProgressBar = require('progress');

var options = {
  version: '~1.2.0',
  directory: process.env.HOME+'/.esvm',
  plugins: ['elasticsearch/marvel/latest'],
  purge: true, // Purge the data directory
  fresh: true, // Download and install a fresh copy
  nodes: 2,
  config: {
    cluster: {
      name: 'My Test Cluster'
    }
  }
};
 
var cluster = libesvm.createCluster(options);

var levels = {
  INFO: clc.green,
  DEBUG: clc.cyan,
  WARN: clc.yellow,
  FATAL: clc.magentaBright,
  ERROR: clc.white.bgRed
};

cluster.on('log', function (log) {
  var bar, pattern;
  if (log.type === 'progress') {
    pattern = log.op + ' [:bar] :percent :etas';
    bar = new ProgressBar(pattern, {
      complete: '=',
      incomplete: ' ',
      width: 80,
      clear: true,
      total: log.total
    });
    log.on('progress', _.bindKey(bar, 'tick'));
    return;
  }
  var level = levels[log.level] || function (msg) { return msg; };
  var message = clc.blackBright(moment(log.timestamp).format('lll'));
  message += ' '+level(log.level);
  if (log.node) {
    message += ' ' + clc.magenta(log.node);
  }
  message += ' ' + clc.yellow(log.type) + ' ';
  message += log.message;
  console.log(message);
});

cluster.install().then(function () {
 return cluster.installPlugins();
}).then(function () {
 return cluster.start(); 
}).then(function () {
  process.on('SIGINT', function () {
    cluster.shutdown().then(function () {
      console.log(clc.black.bgWhite("Bye Bye!"));
      process.exit();
    });
  });
  process.stdin.read();
}).catch(function (err) {
 console.log('Oops', err.stack);
});

```

