# `CliDevMode`

A class that manages the alternate behavior of the Kibana cli when using the `--dev` flag. This mode provides several useful features in a single CLI for a nice developer experience:

  - automatic server restarts when code changes
  - runs the `@kbn/optimizer` to build browser bundles, 
  - runs a base path proxy which helps developers test that they are writing code which is compatible with custom basePath settings while they work
  - pauses requests when the server or optimizer are not ready to handle requests so that when users load Kibana in the browser it's always using the code as it exists on disk

To accomplish this, and to make it easier to test, the `CliDevMode` class manages several objects:

## `Watcher`

The `Watcher` manages a [chokidar](https://github.com/paulmillr/chokidar) instance to watch the server files, logs about file changes observed and provides an observable to the `DevServer` via its `serverShouldRestart$()` method.

## `DevServer`

The `DevServer` object is responsible for everything related to running and restarting the Kibana server process:
 - listens to restart notifications from the `Watcher` object, sending `SIGKILL` to the existing server and launching a new instance with the current code. It 
 - writes the stdout/stderr logs from the Kibana server to the parent process
 - gracefully kills the process if the SIGINT signal is sent (with a timeout)
 - kills the server if the SIGTERM signal is sent, or process.exit() is used
 - proxies SIGHUP notifications to the child process, though the core team is working on migrating this functionality to the KP and making this unnecessary

## `Optimizer`

The `Optimizer` object manages a `@kbn/optimizer` instance, adapting its configuration and logging to the data available to the CLI.

## `BasePathProxyServer` (currently passed from core)

The `BasePathProxyServer` is passed to the `CliDevMode` from core when the dev mode is trigged by the `--dev` flag. This proxy injects a random three character base path in the URL that Kibana is served from to help ensure that Kibana features are written to adapt to custom base path configurations from users.

The basePathProxy also has another important job: ensure that all requests from the browser are received by the most Kibana server running the most recent iteration of the code, don't fail because the server is restarting, and receive the most recent front-end assets from the optimizer. We accomplish this by observing the ready state of the `Optimizer` and `DevServer` objects and pausing all requests through the proxy until both objects report that they are ready to receive requests.