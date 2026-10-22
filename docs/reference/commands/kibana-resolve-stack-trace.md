---
navigation_title: kibana-resolve-stack-trace
applies_to:
  deployment:
    self: ga
products:
  - id: kibana
---

# kibana-resolve-stack-trace [kibana-resolve-stack-trace]

The `kibana-resolve-stack-trace` tool resolves {{kib}} stack traces to source code locations.


## Synopsis [_synopsis_resolve_stack_trace]

```shell
bin/kibana-resolve-stack-trace
[-V, --version] [-h, --help]
```


## Description [_description_resolve_stack_trace]

{{kib}} ships minified code with source maps it doesn't use by default, so stack traces point to minified files. Run this command, paste stack traces or logs, and press Enter on an empty line to resolve them. You can also pipe text to it.

To have {{kib}} use the source maps itself, set these environment variables:

`KBN_ENABLE_SERVER_SOURCE_MAPS=true`
:   {{kib}} resolves its server stack traces. This increases memory usage.

`KBN_ENABLE_BROWSER_SOURCE_MAPS=true`
:   {{kib}} serves the source maps of its browser bundles to browser developer tools, which then show source file names and lines, but not the source code. Reload without the cache after enabling it. `error.stack` in the browser still points to the bundles, and there's no effect when bundles are served from a CDN with `server.cdn.url`.

Third-party plugins can include their own source maps. To have Node.js use them, add `--enable-source-maps` to the `config/node.options` file.

::::{important}
Run this tool from the same {{kib}} build as the stack traces, otherwise the resolved locations are wrong.
::::


## Parameters [kibana-resolve-stack-trace-parameters]

`-h, --help`
:   Returns all of the command parameters.

`-V, --version`
:   Displays the {{kib}} version number.


## Examples [_examples_resolve_stack_trace]

The following command prompts for stack traces to resolve.

```shell
bin/kibana-resolve-stack-trace
```

The following command resolves the stack traces in `kibana.log`.

```shell
bin/kibana-resolve-stack-trace < kibana.log
```
