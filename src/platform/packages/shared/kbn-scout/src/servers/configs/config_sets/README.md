# Scout server config sets

Each directory here is a **custom server config set**: a set of `ScoutServerConfig` overrides that Scout uses to boot its own Kibana (and Elasticsearch) instance, instead of sharing the `default` set.

> [!WARNING]
> **Adding a new config set is a last resort.** Every set costs a dedicated server instance in CI, cannot run on Elastic Cloud, and can't be toggled per suite. Most flags don't need one — they can be set at runtime with `apiServices.core.settings()`, which works everywhere and shares the default servers.
>
> **Talk to the Apps DX team (`#kibana-qa`) before adding a set.** This directory is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so a new set needs their review either way — raising it first avoids writing a config that gets rejected.

## The default set tracks Cloud

The `default` set is meant to reflect how Kibana actually runs in Cloud, so feature flags aren't enabled there unless they're enabled in the Cloud environment too. That gives a simple rule:

- **Don't flip a feature flag in `default/`** to make your suite pass.
- Testing non-default behavior — anything behind a flipped flag — belongs at runtime via `apiServices.core.settings()` if the flag allows it, and in its own config set only when Kibana must have the setting at boot.

## Read before adding or changing a set

Don't reimplement the guidance from these docs here — read them:

- [Feature flags — runtime vs. server-level](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-when-to-use) — the decision table, and why runtime flags are preferred.
- [Feature flags — custom server configs](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) — when a set is genuinely unavoidable, how Scout discovers one (`test/scout_<name>/` or `--serverConfigSet <name>`), the file naming convention, and a worked example.
- [Scout best practices — prefer runtime feature flags](https://www.elastic.co/docs/extend/kibana/testing/scout-best-practices#prefer-runtime-feature-flags) — the short version.

## Worth checking first

- **Could this be a runtime flag?** A config set is only needed when Kibana must have the setting at boot — for example, one read during a plugin's `setup` lifecycle to gate HTTP route registration.
- **Does an existing set already cover it?** Scan the sibling directories for one with an overlapping purpose or `serverArgs`. Reuse it, or ask its owners whether it can be extended when no existing consumer regresses. A set that duplicates another's purpose multiplies CI cost for no benefit.
- **Is the set minimal?** Import the closest existing config (usually `default/`) into your own set and override only the args you need, rather than copying a whole config.
