# File map

Find the file by grep first. This map is a hint, not a complete inventory.

```bash
git grep -n -- '<prefix-or-key>' HEAD -- docs/reference
```

## kibana.yml YAML

Published hub: https://www.elastic.co/docs/reference/kibana/configuration-reference

Host Markdown files live next to the YAML and include it with `{settings}`. Elastic Cloud Hosted lists a subset in `docs/reference/cloud/elastic-cloud-kibana-settings.md` using `:deployment: ech`.

| Typical key prefix | YAML | Host Markdown |
|---|---|---|
| Core keys (`server.*`, `elasticsearch.*`, `csp.*`, `migrations.*`, `pid.*`, `ops.*`, `console.*`, `newsfeed.*`, `node.roles`, `path.data`, `savedObjects.*`, `uiSettings.overrides`, …) | `docs/reference/configuration-reference/general-settings.yml` | `general-settings.md` |
| `logging.*` (full logging schema) | `logging-settings.yml` | `logging-settings.md` |
| `i18n.*` | `internationalization-settings.yml` | `internationalization-settings.md` |
| `xpack.actions.*`, `xpack.alerting.*`, `xpack.encryptedSavedObjects.*` (alerting-related) | `alerting-settings.yml` | `alerting-settings.md` |
| `xpack.apm.*` / APM app indices | `apm-settings.yml` | `apm-settings.md` |
| `xpack.fleet.*` | `fleet-settings.yml` | `fleet-settings.md` |
| `xpack.security.*` (authc, session, encryption) | `security-settings.yml` | `security-settings.md` |
| `xpack.securitySolution.*` (yml config, not UI settings) | `security-solution-settings.yml` | `security-solution-settings.md` |
| `xpack.reporting.*` | `reporting-settings-enable.yml`, `reporting-settings-encryption-key.yml`, `reporting-settings-background-job.yml`, `reporting-settings-png-pdf.yml`, `reporting-settings-csv.yml` | `reporting-settings.md` (several includes) |
| `xpack.task_manager.*` | `task-manager-settings.yml` | `task-manager-settings.md` |
| `xpack.spaces.*` | `spaces-settings.yml` | `spaces-settings.md` |
| `xpack.cases.*` | `cases-settings.yml` | `cases-settings.md` |
| `xpack.banners.*` | `banner-settings.yml` | `banner-settings.md` |
| `xpack.maps.*` / extra map keys not in general | `map-settings.yml` | `map-settings.md` |
| `xpack.monitoring.*` | `monitoring-settings.yml` | `monitoring-settings.md` |
| `xpack.profiling.*` | `profiling-settings.yml` | `profiling-settings.md` |
| `telemetry.*` (yml) | `telemetry-settings.yml` | `telemetry-settings.md` |
| Search sessions | `search-sessions-settings.yml` | `search-sessions-settings.md` |
| URL drilldowns | `url-drilldown-settings.yml` | `url-drilldown-settings.md` |
| Share | `share-settings.yml` | `share-settings.md` |
| Logs UI / metrics UI yml | `logs-settings.yml`, `metrics-settings.yml` | matching `.md` |
| AI Assistant artifact repo | `ai-assistant-settings.yml` | `ai-assistant-settings.md` |
| Automatic Import | `automatic-import-settings.yml` | `automatic-import-settings.md` |
| Product intercept | `product-intercept-settings.yml` | `product-intercept-settings.md` |

If the prefix is new and no file fits, add a new YAML plus host Markdown, then add both to `docs/reference/toc.yml`. Do not add a new page when an existing file already documents that prefix.

Resolve `configPath` from the plugin `kibana.jsonc`. `["xpack", "spaces"]` plus schema field `maxSpaces` is `xpack.spaces.maxSpaces`.

## Advanced Settings YAML

Published page: https://www.elastic.co/docs/reference/kibana/advanced-settings

| Scope in code | YAML | Host section |
|---|---|---|
| `uiSettings.register()` or `scope: 'namespace'` (default) | `docs/reference/advanced-settings-space.yml` | `advanced-settings.md` → **Change the space-specific setting** |
| `uiSettings.registerGlobal()` or `scope: 'global'` | `docs/reference/advanced-settings-global.yml` | **Change the global settings** (`serverless: unavailable` on that heading) |

For `serverless: ga` vs `serverless: unavailable`, check `src/platform/packages/shared/serverless/settings/common/index.ts`. If the ID is there, write `serverless: ga`. If the ID is only in a project file, nest `observability`, `security`, `elasticsearch`, or `vectordb` under `serverless`. Map `search_project` to `elasticsearch` and `vectordb_project` to `vectordb`. Ignore `workplace_ai_project`. That project type never shipped, and docs-builder has no `workplace_ai` key. Those files use ID constants from `src/platform/packages/shared/kbn-management/settings/setting_ids/index.ts`, not the YAML key. If the ID is on none of the four mapped lists, write `serverless: unavailable`.

Place the entry in the YAML `group` that matches the `category` string used in the UI. Current space-settings groups include:

- General
- Presentation Labs
- Accessibility
- Autocomplete
- Banners
- Cases
- Discover
- `{{product.machine-learning}}`
- Notifications
- `{{observability}}`
- Reporting
- Rollup
- `{{product.elasticsearch}}`
- Security solution
- Timelion
- Visualization
- Developer tools
- Workflows

If `category` is omitted, the setting lands in General in the UI. Put it in **General** in the YAML unless a sibling in the same plugin already uses another group.

Do not invent a group name. If the UI adds a new category, add a matching `group` with an `id`.

Global settings today include `hideAnnouncements` and custom branding keys. Add new global keys next to the existing global group that matches their UI section.

## When not to add YAML

- Internal flags with no operator or UI surface
- Test-only config
- A rename that is already handled by a documented deprecation, unless the old key is still valid

If the change is convenience-only and the existing YAML sentence is still true, leave the YAML alone.
