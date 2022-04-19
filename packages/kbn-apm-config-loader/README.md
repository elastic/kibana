# @kbn/apm-config-loader

Configuration loader for the APM instrumentation script.

This module is only meant to be used by the APM instrumentation script (`src/apm.js`)
to load the required configuration options from the `kibana.yaml` configuration file with
default values.

### Why not just use @kbn-config?

`@kbn/config` is the recommended way to load and read the kibana configuration file,
however in the specific case of APM, we want to only need the minimal dependencies
before loading `elastic-apm-node` to avoid losing instrumentation on the already loaded modules.


Bla bla bla