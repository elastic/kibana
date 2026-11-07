# @kbn/core-ui-settings-browser

This package contains the public types for the browser-side ui-settings service.

## Runtime entries vs full definitions

The `SettingsStart` contract (`core.settings`) exposes two clients with different data:

| | `client` / `globalClient` | `metadata` |
| --- | --- | --- |
| **Interface** | `IUiSettingsClient` | `IUiSettingsMetadataClient` |
| **Data** | Slim `UiSettingsRuntimeEntry` — the value, type and operational flags | Full `UiSettingsParams` — display name, description, category, options, etc. |
| **Availability** | Synchronous; populated from the bootstrap payload | Asynchronous; fetched on demand from `GET /internal/kibana/settings/metadata` |
| **Use case** | Reading and writing setting values at runtime | Rendering settings management forms |

### When you need full definitions

If your page renders a settings form — field labels, descriptions, category grouping, select options — you need the full definitions. Call `settings.metadata.getAll(scope)` with `'namespace'` or `'global'`, then merge the result with the client's runtime state:

```ts
import { mergeSettingDefinitions, normalizeSettings } from '@kbn/management-settings-utilities';

const definitions = await settings.metadata.getAll('namespace');
const merged = mergeSettingDefinitions(definitions, settings.client.getAll());
const normalized = normalizeSettings(merged);
```

Because `metadata.getAll` is asynchronous, your component must handle loading and error states. See the `@kbn/management-settings-application` README for the recommended patterns.

### When you only need runtime values

Most application code only needs the current value of a setting. Use `settings.client.get(key)` or `settings.client.get$(key)` — these are synchronous and do not require any additional fetching.
