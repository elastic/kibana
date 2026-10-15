# Scout server config sets

Each folder here is a Scout server config set: the `ScoutServerConfig` Scout uses to boot the Kibana and Elasticsearch test servers. Most Scout configs run against the `default` set, the shared baseline. Every other folder is a custom set that boots the test servers with its own configuration.

> [!WARNING]
> A custom server config set should be a last resort: each one adds CI cost, can't be toggled per suite, and doesn't run on Elastic Cloud. Work down this list before adding one:
>
> 1. **Stay on `default`** when the setting can be [toggled at runtime](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-runtime) with `apiServices.core.settings()`. Most feature flags can.
> 2. **Reuse an existing set** when one already boots with what you need, or ask its owners to extend it.
> 3. **Create a new set only** when the setting must be present at boot (like a plugin `enabled` flag) and nothing existing fits.
>
> Reach out to the Apps DX team (`#kibana-qa`) before adding one.

For when a custom set is justified, how Scout discovers one, and a worked example, see [**Custom server configs**](https://www.elastic.co/docs/extend/kibana/testing/feature-flags#scout-feature-flags-custom-servers) in the Scout docs.

## Ownership and review

New config sets require a review from the Apps DX team. If possible, explain in the PR description why the suite needs its own config set and why runtime settings or an existing set cannot cover it.

Teams can own their config sets by adding an entry for the config set's directory in [`.github/CODEOWNERS`](../../../../../../../../../.github/CODEOWNERS). Include this entry in the PR that adds the set. Apps DX remains the default owner of this directory and reviews new sets; subsequent changes to a team-owned set only require the owning team's review.
