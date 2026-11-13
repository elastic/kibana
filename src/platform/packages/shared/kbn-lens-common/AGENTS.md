# @kbn/lens-common: Agent Context

The visualization and datasource types in this package are the state Lens stores in saved objects and dashboards. Lens as code turns that state into the public API, and back. Every setting a user can configure in the Lens editor is part of that API, so a feature that adds one is not done until the API supports it, in the same PR.

Before you add a setting or a new value to these types, follow [Lens as code](../kbn-lens-embeddable-utils/config_builder/AGENTS.md).
