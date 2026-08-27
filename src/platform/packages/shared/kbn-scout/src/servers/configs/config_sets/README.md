# Scout server config sets

Each directory here is a **custom server config set**: a set of `ScoutServerConfig` overrides that Scout uses to boot its own Kibana (and Elasticsearch) instance, instead of sharing the `default` set.

> [!WARNING]
> **Adding a new config set is a last resort.** Every set costs a dedicated server instance in CI and can't be toggled per suite. Many settings don't need one — Kibana Core feature flags can be flipped at runtime with `apiServices.core.settings()`, which needs no server restart and shares the default servers.
>
> **Talk to the Apps DX team (`#kibana-qa`) before adding a set.** This directory is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so a new set needs their review either way — raising it first avoids writing a config that gets rejected.

## Why not just enable the flag in `default/`?

The `default` set mirrors, as closely as possible, the configuration of an Elastic Cloud deployment or project — a [Cloud-first approach](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#design-tests-with-a-cloud-first-mindset). Two things follow from that:

- A test passing locally is good signal that it will pass in the Elastic Cloud pipelines: write a Scout test once, run it everywhere.
- Keeping the default clean is what lets UI and API configs from different solutions share one set of servers — and plenty of suites rely on that environment staying stable.

So the rule is: **feature flags aren't enabled in `default/` unless they're enabled in the Cloud environment too.** Experimental behavior doesn't belong in the environment that represents the default customer experience. A suite that exercises a flipped flag goes at runtime where the flag allows it, and into its own set only when Kibana needs the setting at boot.

## Read before adding or changing a set

Don't reimplement the guidance from these docs here — read them:

- [Feature flags — runtime vs. server-level](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-when-to-use) — the decision table, and why runtime flags are preferred.
- [Feature flags — custom server configs](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) — when a set is genuinely unavoidable, how Scout discovers one (`test/scout_<name>/` or `--serverConfigSet <name>`), the file naming convention, and a worked example.
- [Scout best practices — prefer runtime feature flags](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#prefer-runtime-feature-flags) — the short version.

## Worth checking first

- **Could this be a runtime flag?** Kibana Core feature flags can be toggled while the server runs. A config set is only needed for settings Kibana must have at boot — plugin `enabled` flags, or anything read during a plugin's `setup` lifecycle, such as gating HTTP route registration.
- **Does an existing set already cover it?** Scan the sibling directories for one with an overlapping purpose or `serverArgs`. Reuse it, or ask its owners whether it can be extended when no existing consumer regresses. A set that duplicates another's purpose multiplies CI cost for no benefit.
- **Is the set minimal?** Import the closest existing config (usually `default/`) into your own set and override only the args you need, rather than copying a whole config.
- **Can you live without Cloud coverage?** A custom set doesn't run in the Scout Elastic Cloud pipeline, since server overrides can't be applied there. It still runs on merge, and selectively on pull requests. That's fine for most suites — but if you specifically need Cloud coverage, a custom set won't give it to you.

None of this is permanent: once the settings a suite needs are enabled by default, its tests can move back to the `default` set and the custom set can be retired.
