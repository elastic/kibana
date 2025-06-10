---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/external-plugin-development.html
---

# External plugin development [external-plugin-development]

::::{important}
The {{kib}} plugin interfaces are in a state of constant development.  We cannot provide backwards compatibility for plugins due to the high rate of change.  {{kib}} enforces that the installed plugins match the version of {{kib}} itself.  Plugin developers will have to release a new version of their plugin for each new {{kib}} release as a result.

::::


Most developers who contribute code directly to the {{kib}} repo are writing code inside plugins, so our [*Contributing*](/extend/contributing.md) docs are the best place to start. However, there are a few differences when developing plugins outside the {{kib}} repo. These differences are covered here.

* [Plugin tooling](/extend/plugin-tooling.md)
* [Functional Tests for Plugins outside the {{kib}} repo](/extend/external-plugin-functional-tests.md)
* [Localization for plugins outside the {{kib}} repo](/extend/external-plugin-localization.md)
* [Testing {{kib}} Plugins](/extend/testing-kibana-plugin.md)





