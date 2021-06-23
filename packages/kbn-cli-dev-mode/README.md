# `CliDevMode`

A class that manages the alternate behavior of the Kibana cli when using the `--dev` flag. This mode provides several useful features in a single CLI for a nice developer experience:

  - automatic server restarts when code changes
  - runs the `@kbn/optimizer` to build browser bundles
  - runs a base path proxy which helps developers test that they are writing code which is compatible with custom basePath settings while they work
  - pauses requests when the server or optimizer are not ready to handle requests so that when users load Kibana in the browser it's always using the code as it exists on disk

To accomplish this, and to make it easier to test, the `CliDevMode` class manages several objects:

## `Watcher`

The `Watcher` manages a [chokidar](https://github.com/paulmillr/chokidar) instance to watch the server files, logs about file changes observed and provides an observable to the `DevServer` via its `serverShouldRestart$()` method.

## `DevServer`

The `DevServer` object is responsible for everything related to running and restarting the Kibana server process:
 - listens to restart notifications from the `Watcher` object, sending `SIGKILL` to the existing server and launching a new instance with the current code
 - writes the stdout/stderr logs from the Kibana server to the parent process
 - gracefully kills the process if the SIGINT signal is sent
 - kills the server if the SIGTERM signal is sent, process.exit() is used, a second SIGINT is sent, or the gracefull shutdown times out
 - proxies SIGHUP notifications to the child process, though the core team is working on migrating this functionality to the KP and making this unnecessary

## `Optimizer`

The `Optimizer` object manages a `@kbn/optimizer` instance, adapting its configuration and logging to the data available to the CLI.

## `BasePathProxyServer`

This proxy injects a random three character base path in the URL that Kibana is served from to help ensure that Kibana features 
are written to adapt to custom base path configurations from users.

The basePathProxy also has another important job, ensuring that requests don't fail because the server is restarting and 
that the browser receives front-end assets containing all saved changes. We accomplish this by observing the ready state of 
the `Optimizer` and `DevServer` objects and pausing all requests through the proxy until both objects report that 
they aren't building/restarting based on recently saved changes.