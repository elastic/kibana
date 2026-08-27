# Scout server config sets

Each folder here is a server config set: the `ScoutServerConfig` Scout uses to boot Kibana (and Elasticsearch). Most Scout configs run against `default/`, the shared baseline. A [custom server config set](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers), which boots its own servers, is the exception.

## The `default` set

`default/` mirrors a real Elastic Cloud deployment as closely as possible (a Cloud-first approach), which matters in two ways:

- Scout follows a [write it once, run it everywhere](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#design-tests-with-a-cloud-first-mindset) philosophy: we want most tests to run against both local deployments and Elastic Cloud.
- A clean baseline keeps `default/` representative of the default customer experience, and lets UI and API configs from different solutions share one set of servers.

Our guidance is to not enable a feature flag in the `default` config set unless it's also enabled by default on Cloud.

## Adding a custom set

A custom set is the right tool only when a setting can't be toggled at runtime and Kibana must have it at boot. It comes at a real cost:

> [!WARNING]
> **Only add a new set as a last resort.** Each one needs its own dedicated server in CI and can't be toggled per suite. Most settings don't need one: Kibana Core feature flags can be [flipped at runtime](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-runtime) with `apiServices.core.settings()` (no test servers restart, shares the default servers).
>
> **Ask the Apps DX team first (`#kibana-qa`).** This folder is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so any new set needs their review anyway.

Check these first:

- **Could a runtime flag cover the setting?** Kibana Core flags can be flipped while the server runs. You only need a custom set for settings Kibana must have at boot: plugin `enabled` flags, or anything read during a plugin's `setup` lifecycle (like gating HTTP route registration).
- **Does an existing config set already cover what you need?** Reuse a sibling folder with a similar purpose or `serverArgs`, or ask its owners about extending it. Two sets doing the same job just double the CI cost.
- **Is your set minimal?** Import the closest existing config (usually `default/`) and override only the args you need.
- **Is it OK if we don't run your Playwright config in our Elastic Cloud pipelines?** A custom set can't run there (server overrides can't be applied in Cloud), only on merge and selectively on PRs.

> [!NOTE]
> Once a suite's settings are on by default, its tests can move back to `default` and the custom set can be retired.

## Learn more

- [Feature flags](https://www.elastic.co/docs/extend/kibana/testing/feature-flags)
- [Scout best practices](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices)
