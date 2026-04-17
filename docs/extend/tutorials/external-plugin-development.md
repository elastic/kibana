---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/external-plugin-development.html
---

# External plugin development [external-plugin-development]

::::{important}
The {{kib}} plugin interfaces are in a state of constant development.  We cannot provide backwards compatibility for plugins due to the high rate of change.  {{kib}} enforces that the installed plugins match the version of {{kib}} itself.  Plugin developers will have to release a new version of their plugin for each new {{kib}} release as a result.

::::


Most developers who contribute code directly to the {{kib}} repo are writing code inside plugins, so our [*Contributing*](/extend/contributing/principles/developer-principles.md) docs are the best place to start. However, there are a few differences when developing plugins outside the {{kib}} repo. These differences are covered here.

* [Plugin tooling](/extend/tutorials/plugin-tooling.md)
* [Functional Tests for Plugins outside the {{kib}} repo](/extend/tutorials/external-plugin-functional-tests.md)
* [Internationalization (i18n)](/extend/tutorials/i18n.md)
* [Testing {{kib}} Plugins](/extend/tutorials/testing-kibana-plugin.md)





