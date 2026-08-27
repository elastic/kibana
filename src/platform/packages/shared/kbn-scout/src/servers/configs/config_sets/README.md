# Scout server config sets

Each folder here is a server config set: the `ScoutServerConfig` Scout uses to boot Kibana (and Elasticsearch). Most are [custom server config sets](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) that boot their own servers; `default/` is the shared baseline.

## The `default` set

Suites run against `default/` unless they request another set. It mirrors a real Elastic Cloud deployment as closely as possible (a Cloud-first approach), which matters in two ways:

- Scout follows a [write it once, run it everywhere](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#design-tests-with-a-cloud-first-mindset) philosophy: a test passing locally is good signal it will also pass in the Cloud pipelines.
- A clean baseline lets UI and API configs from different solutions share one set of servers, which many suites rely on staying stable.

So don't enable a feature flag in `default/` unless it's also on in Cloud. Experimental behavior shouldn't live in the environment that stands in for the normal customer experience.

## Adding a custom set

> [!WARNING]
> **Only add a new set as a last resort.** Each one needs its own dedicated server in CI and can't be toggled per suite. Most settings don't need one: Kibana Core feature flags can be [flipped at runtime](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-runtime) with `apiServices.core.settings()` (no test servers restart, shares the default servers).
>
> **Ask the Apps DX team first (`#kibana-qa`).** This folder is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so any new set needs their review anyway.

Check these first:

- **Could it be a runtime flag?** Kibana Core flags flip while the server runs. You only need a set for settings Kibana must have at boot: plugin `enabled` flags, or anything read during a plugin's `setup` lifecycle (like gating HTTP route registration).
- **Does a set already cover it?** Reuse a sibling folder with a similar purpose or `serverArgs`, or ask its owners about extending it. Two sets doing the same job just double the CI cost.
- **Is your set minimal?** Import the closest existing config (usually `default/`) and override only the args you need.
- **Can you skip Cloud coverage?** A custom set doesn't run in the Scout Elastic Cloud pipeline (no server overrides there), only on merge and selectively on PRs.

> [!NOTE]
> Once a suite's settings are on by default, its tests can move back to `default` and the custom set can be retired.

## Learn more

- [Feature flags](https://www.elastic.co/docs/extend/kibana/testing/feature-flags)
- [Scout best practices](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices)
