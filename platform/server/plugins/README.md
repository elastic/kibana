# The Kibana Plugin System

## Directory structure

The Kibana plugin system expects built JavaScript for the server to be in
`./target/server` within the plugin folder. If you're writing a pure JavaScript
plugin that does not require a build step, the JavaScript must still be in that
folder.

## How plugins are defined

## Function or class

A Kibana plugin can either be defined as a function or a class.

As a function:

```js
TODO example
```

As a class:

```js
TODO
```

## Dependencies

## Lifecycle

Plugins are started when Kibana starts up. There is no way to start plugins
after Kibana is started.

Any plugin that is implemented as a class _MUST_ implement the `start` method,
which will be called when the plugin is started. The `start` method returns the
public api of the plugin.

Plugins are stopped when Kibana is stopped. There is no way to stop a plugin
_before_ Kibana is stopped. Any plugin that is implemented as a `class` can
specify a `stop` method that gets called when the plugin is stopped.

```js
TODO example of "stop"
```

## Exposing values

## Typed vs untyped plugins
