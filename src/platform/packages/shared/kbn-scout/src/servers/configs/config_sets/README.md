# Scout server config sets

Each folder here is a Scout server config set: the `ScoutServerConfig` Scout uses to boot the Kibana and Elasticsearch test servers. Most Scout configs run against the `default` config set, the shared baseline. A [custom server config set](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers), which boots the test servers with a custom configuration, should only be created in exceptional cases.

## The default config set

`default/` mirrors a real Elastic Cloud deployment as closely as possible (a Cloud-first approach), which matters in two ways:

- Scout follows a [write it once, run it everywhere](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#design-tests-with-a-cloud-first-mindset) philosophy: we want most tests to run against both local deployments and Elastic Cloud.
- A clean baseline keeps `default/` representative of the default customer experience, and lets UI and API configs from different solutions run against a shared set of test servers.

We advise against enabling a feature flag in the `default` config set unless it's also enabled by default on Cloud.

## Adding a custom set

A custom set is the right tool only when a setting can't be toggled at runtime and Kibana must have it at boot. It comes at a cost:

- We currently can't run Playwright configs that use a custom server config set on Elastic Cloud.

> [!WARNING]
> **Only add a new set as a last resort.** Each one needs its own dedicated server in CI and can't be toggled per suite.

Before creating a custom server config set, consider:

- **Could a runtime flag cover the setting?** Kibana Core feature flags can be [flipped at runtime](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-runtime) with `apiServices.core.settings()` (no test servers restart). You only need a custom set for settings Kibana must have at boot: plugin `enabled` flags, or anything read during a plugin's `setup` lifecycle (like gating HTTP route registration).
- **Does an existing config set already cover what you need?** Reuse a sibling folder with a similar purpose or `serverArgs`, or ask its owners about extending it. Two sets doing the same job just double the CI cost.
- **Is your set minimal?** Import the closest existing config (usually `default/`) and override only the args you need.

If you still need a custom config set, reach out to the Apps DX team (`#kibana-qa`) for guidance.

> [!NOTE]
> We advise deleting the custom server config set and using the default config set once the feature flag is enabled by default in production.

## Docs

- [Feature flags](https://www.elastic.co/docs/extend/kibana/testing/feature-flags)
- [Custom server config sets](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) (what they are and how they work)
- [Scout best practices](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices)
