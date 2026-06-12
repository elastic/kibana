---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-visualize-index.html
---

# Developing Visualizations [development-visualize-index]

::::{important}
These pages document internal APIs and are not guaranteed to be supported across future versions of {{kib}}.

::::


The internal APIs for creating custom visualizations are in a state of heavy churn as they are being migrated to the new {{kib}} platform, and large refactorings have been happening across minor releases in the `7.x` series. In particular, in `7.5` and later we have made significant changes to the legacy APIs as we work to gradually replace them.

As a result, starting in `7.5` we have removed the documentation for the legacy APIs to prevent confusion. We expect to be able to create new documentation later in `7.x` when the visualizations plugin has been completed.

We would recommend waiting until later in `7.x` to upgrade your plugins if possible. If you would like to keep up with progress on the visualizations plugin in the meantime, here are a few resources:

* The [breaking changes](/release-notes/breaking-changes.md#kibana-900-breaking-changes) documentation, where we try to capture any changes to the APIs as they occur across minors.
* [Meta issue](https://github.com/elastic/kibana/issues/44121) which is tracking the move of the plugin to the new {{kib}} platform
* Our [Elastic Stack workspace on Slack](https://www.elastic.co/blog/join-our-elastic-stack-workspace-on-slack).
* The [source code](https://github.com/elastic/kibana/blob/master/src/platform/plugins/shared/visualizations), which will continue to be the most accurate source of information.

