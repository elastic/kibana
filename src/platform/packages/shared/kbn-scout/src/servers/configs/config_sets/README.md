# Scout server config sets

Each directory here is a **custom server config set**: a set of `ScoutServerConfig` overrides that Scout uses to boot its own Kibana (and Elasticsearch) instance, instead of sharing the `default` set.

> [!WARNING]
> **Adding a new config set is a last resort.** Every set costs a dedicated server instance in CI, cannot run on Elastic Cloud (QA), and can't be toggled per suite. Most flags don't need one — they can be set at runtime with `apiServices.core.settings()`, which works everywhere and shares the default servers.
>
> **Talk to the Apps DX team (`#kibana-qa`) before adding a set.** This directory is owned by `@elastic/appex-qa` in `.github/CODEOWNERS`, so a new set needs their review either way — raising it first avoids writing a config that gets rejected.

## Read before adding or changing a set

Don't reimplement the guidance from these docs here — read them:

- [Feature flags — runtime vs. server-level](../../../../../../../../../docs/extend/testing/feature-flags.md#scout-feature-flags-when-to-use) — the decision table, and why runtime flags are preferred.
- [Feature flags — custom server configs](../../../../../../../../../docs/extend/testing/feature-flags.md#scout-feature-flags-custom-servers) — when a set is genuinely unavoidable, how Scout discovers one (`test/scout_<name>/` or `--serverConfigSet <name>`), the file naming convention, and a worked example.
- [Scout best practices — prefer runtime feature flags](../../../../../../../../../docs/extend/testing/scout-best-practices.md#prefer-runtime-feature-flags) — the short version.

## Before you open a PR, be able to answer

1. **Why can't this be a runtime flag?** A setting only qualifies if Kibana must have it at boot — e.g. it's read during a plugin's `setup` lifecycle to gate HTTP route registration. "It was easier" or "that's how the FTR config did it" doesn't qualify.
2. **Does an existing set already cover it?** Scan the sibling directories for one with an overlapping purpose or `serverArgs`. Reuse it, or ask its owners to extend it when no existing consumer regresses. A set that duplicates another's purpose multiplies CI cost for no benefit.
3. **Is the set minimal?** Extend the closest existing config (usually `default/`) and add only the args you need, rather than copying a whole config.
