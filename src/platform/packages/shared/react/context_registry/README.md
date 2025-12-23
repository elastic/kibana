# @kbn/react-context-registry

This package allows you to create a React context instance that is shared across bundles.
For example, you have plugin A that provides a React context and plugin B that consumes it. If both plugins use their own React context instance, the consumer in plugin B will not be able to access the value provided by plugin A.
This is a workaround for a Kibana plugin bundling system limitation that creates its own instance of a package per plugin by default.
