# Scout server config sets

Each folder here is a server config set: the `ScoutServerConfig` Scout uses to boot Kibana (and Elasticsearch). `default/` is what suites get unless they ask for something else. Every other folder is a [custom server config set](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) that boots its own servers instead.

> [!WARNING]
> **Only add a new set as a last resort.** Each one needs its own dedicated server in CI, and you can't turn it on or off per suite. Most settings don't need a set at all: Kibana Core feature flags can be [flipped at runtime](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-runtime) with `apiServices.core.settings()` (no test servers restart, shares the default servers).
>
> **Ask the Apps DX team first (`#kibana-qa`).** This folder is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so any new set needs their review anyway. Asking first saves you writing a config that gets rejected.

## Why not just enable the flag in the `default` config set?

The `default` set is meant to match a real Elastic Cloud deployment as closely as possible (a Cloud-first approach). Two reasons that matters:

- Scout follows a [write it once, run it everywhere](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#design-tests-with-a-cloud-first-mindset) philosophy: if a test passes locally, that's a good sign it will also pass in the Cloud pipelines.
- A clean default is what lets UI and API configs from different solutions share one set of servers. Many suites count on that staying stable.

So the rule is: **don't enable a feature flag in `default/` unless it's also on in Cloud.** Experimental behavior shouldn't live in the environment that stands in for the normal customer experience. A suite that tests a flipped flag should flip it at runtime where possible, and only get its own set when Kibana needs the setting at boot.

## Check these before creating a new set

- **Could it be a runtime flag?** Kibana Core flags can be flipped while the server runs. You only need a set for settings Kibana must have at boot: plugin `enabled` flags, or anything read during a plugin's `setup` lifecycle (like gating HTTP route registration).
- **Does a set already cover it?** Look through the sibling folders for one with a similar purpose or `serverArgs`. Reuse it, or ask its owners about extending it (as long as nothing else breaks). Two sets doing the same job just doubles CI cost for nothing.
- **Is your set minimal?** Import the closest existing config (usually `default/`) and override only the args you need, instead of copying a whole config.
- **Can you skip Cloud coverage?** A custom set doesn't run in the Scout Elastic Cloud pipeline (server overrides can't be applied there). It still runs on merge, and selectively on PRs. That's fine for most suites, but if you specifically need Cloud coverage, a custom set won't give it to you.

> [!NOTE]
> Once a suite's settings are on by default, its tests can move back to `default` and the custom set can be retired.

## Learn more

- [Feature flags](https://www.elastic.co/docs/extend/kibana/testing/feature-flags)
- [Scout best practices](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices)
