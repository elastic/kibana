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
