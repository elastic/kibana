# Settings YAML schema

Canonical schema: [automated settings](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md). Example: [settings-with-applies-example.yml](https://github.com/elastic/docs-builder/blob/main/docs/syntax/settings-with-applies-example.yml).

Copy a sibling in the same file. Do not invent field names.

## File header

```yaml
product: Kibana
collection: <page title used in generated docs>
id: <page-anchor-id>
page_description: |
  Optional Markdown for the collection intro.
```

Keep `product` and `collection`. Change `id` only when you create a new collection.

## Groups and settings

```yaml
groups:
  - group: <heading>
    id: <group-anchor>
    description: |
      Optional Markdown.
    note: Optional string or Markdown.
    example: |
      Optional Markdown, often a fenced yaml block.
    settings:
      - setting: dotted.key
        id: optional-anchor
        description: |
          Required Markdown.
        datatype: bool
        default: true
        applies_to:
          stack: ga
          ech: ga
          ece: ga
          eck: ga
          self: ga
          serverless: ga
```

### Fields on a setting

| Field | Role |
|---|---|
| `setting` | Runtime key. Quote keys with colons. |
| `description` | Markdown. Links, substitutions, inline `{applies_to}`, admonitions, and dropdowns are allowed. |
| `id` | HTML anchor. Set it when the generated slug would collide or stay unreadable. |
| `datatype` | Shown as **Datatype**. See mapping below. |
| `default` | Shown as **Default**. The current product value at HEAD. Quote strings that YAML would otherwise mistype. Never omit this field to encode an older value. |
| `options` | Enum values: `option` plus optional `description`. |
| `applies_to` | Availability. Required for new entries. |
| `note`, `tip`, `warning`, `important` | Admonitions on the setting. To gate one to a version or deployment, put `:applies_to:` on the first line of the field. |
| `deprecation_details` | Extra deprecation prose. Pair with `applies_to` lifecycle `deprecated` or `removed`. |
| `example` | Markdown sample, usually `kibana.yml`. |
| `settings` | Nested child settings. Children inherit `applies_to` unless they override it. Nested keys often look like `"[n].url"`. |

### Datatype mapping

Use the value the surrounding file already uses for the same schema type.

| Source | Typical `datatype` |
|---|---|
| `schema.boolean()` / `type: 'boolean'` | `bool` (some files use `boolean`) |
| `schema.number()` integer | `int` |
| `schema.number()` fractional | `float` |
| `schema.string()` / `type: 'string'` | `string` |
| `schema.oneOf` literals / `type: 'select'` | `enum` plus `options` |
| `schema.arrayOf(schema.string())` | `array of strings` or `list` |
| `schema.arrayOf(...)` | `array` |
| `schema.object()` | `object` |
| `type: 'json'` | `json` |
| `type: 'image'` | `image` |

Do not invent a datatype the file never uses.

## applies_to in settings YAML

The canonical authoring contract lives in docs-builder. Until [docs-builder#4014](https://github.com/elastic/docs-builder/pull/4014) merges, use that PR. After merge, use [applies_to in settings YAML](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md#settings-yaml). This skill keeps the rules an agent needs to tag Kibana YAML.

This is a settings-YAML particularity. Do not apply the usual `docs-applies-to-tagging` rule that stack and deployment keys must share the same lifecycle.

| Key | What it means here | Write |
|---|---|---|
| `stack` | Lifecycle and optional version history for Elastic Stack | Omit the version if the setting was added before 9.0: `ga` or `preview`. A new setting should include a version: `ga 9.4+`. Multiple values are allowed: `preview 9.0-9.2, ga 9.3+`, `ga 9.0-9.3, removed 9.4+` |
| `ech`, `ece`, `eck`, `self` | Supported on that deployment, or not | Always list all four. `ga` if supported. `unavailable` if not. Never a version. Never `preview`, `experimental`, `deprecated`, or `removed` |
| `serverless` | Supported on serverless, or not | Always list it. `ga` if every serverless project supports it. `unavailable` if none do. Never a version. Never `preview`, `experimental`, `deprecated`, or `removed`. For Advanced Settings, check `src/platform/packages/shared/serverless/settings/`. If the ID is only on some projects, nest `elasticsearch`, `observability`, `security`, or `vectordb` under `serverless`. Do not nest `workplace_ai` |

`ga` on a deployment key is a support flag. It does not mean the setting is generally available. If `stack` is `preview` and the Elastic Cloud Hosted user-settings allowlist includes the key, write `ech: ga`.

Preferred map form (supported everywhere):

```yaml
applies_to:
  stack: ga
  ech: ga
  ece: ga
  eck: ga
  self: ga
  serverless: ga
```

Only some serverless projects. Nest the docs-builder keys that match the allowlist. `search_project` maps to `elasticsearch`. `vectordb_project` maps to `vectordb`. Do not nest `workplace_ai`:

```yaml
applies_to:
  stack: ga
  ech: ga
  ece: ga
  eck: ga
  self: ga
  serverless:
    elasticsearch: ga
    vectordb: ga
```

Self-managed only. `unavailable` keys are not rendered as badges. They also hide the setting from a `:deployment:` filter:

```yaml
applies_to:
  stack: ga
  ech: unavailable
  ece: unavailable
  eck: unavailable
  self: ga
  serverless: unavailable
```

Some existing files use a list of strings. Match the file's map-versus-list shape. Do not convert a whole file in the same PR as a setting add.

`ech` is Elastic Cloud Hosted. Do not add new `ess` keys.

### Cloud filter

`docs/reference/cloud/elastic-cloud-kibana-settings.md` includes YAML with `:deployment: ech`.

docs-builder shows a setting on that page when the entry has `ech: ga`. Write `ech: ga` only if the Elastic Cloud Hosted Kibana user-settings allowlist includes the key. That list lives in the `cloud` repository. Write `ech: unavailable` when the key is not allowlisted. `unavailable` hides the setting from this page and does not render an ECH badge. A missing `applies_to` block on the entry shows the setting on the Cloud page. Always set `applies_to`.

### Do not copy stack lifecycle onto deployments

Wrong (deployment keys must not carry preview or experimental):

```yaml
applies_to:
  stack: preview
  ech: preview
  self: preview
```

Wrong (do not omit unsupported deployments):

```yaml
applies_to:
  stack: ga
  self: ga
```

Right:

```yaml
applies_to:
  stack: preview
  ech: ga
  ece: ga
  eck: ga
  self: ga
  serverless: ga
```

Right (not supported on Elastic Cloud Hosted):

```yaml
applies_to:
  stack: ga
  ech: unavailable
  ece: unavailable
  eck: unavailable
  self: ga
  serverless: unavailable
```

### When to put a version on stack

No version means the setting applies to all 9.0+ versions and it was added before 9.0: `stack: ga` or `stack: preview`.

A new setting should include a version: `stack: ga 9.5+` or `stack: preview 9.5+`.

Omit the version only if the setting already existed in the product before 9.0 and was missing from the docs.

If that minor is not released yet, still write the version. The docs show Planned until it ships. That is automated rendering. Do not omit the version to hide Planned.

Rules: [badge rendering reference](https://elastic.github.io/docs-builder/syntax/applies/#badge-rendering-reference).

### Lifecycle history on stack

`stack` accepts more than one lifecycle. Separate them with a comma. Append the new state. Do not overwrite the previous one.

| Change | Write |
|---|---|
| Preview, then GA | `stack: preview 9.0-9.2, ga 9.3+` |
| GA, then deprecated | `stack: ga 9.0-9.3, deprecated 9.4+` |
| Then removed | `stack: ga 9.0-9.3, deprecated 9.4-9.5, removed 9.6+` |
| Preview, then removed | `stack: preview 9.0-9.2, removed 9.3+` |

When you remove a setting that existed on Stack, keep the YAML entry. Users on earlier versions still need to find the key. Append `removed` and the version on `stack`. Keep the same deployment `ga` or `unavailable` values the setting already had. Do not write `removed` on `ech`, `ece`, `eck`, or `self`. Older files may still say `ech: removed`. Do not copy that for new work.

If the setting leaves serverless and it still exists on Elastic Stack, write `serverless: unavailable`. Serverless has no version history on these keys.

If the setting existed only on serverless and is removed, delete the YAML entry.

### The `default` field

`default` is the current product value at HEAD. Match `schema.*({ defaultValue })` or the uiSettings `value`. Include it when the source defines it.

Do not omit `default` to encode history. Do not replace it with description bullets. A sibling that lists old defaults in the description is not a template for this field.

When an earlier minor used a different default, keep `default` as the HEAD value. Put the previous value in a gated `note`. Do not write the version in the note body. The `:applies_to:` range carries the version.

```yaml
        default: 500MB
        note: |
          :applies_to: stack: ga 9.0-9.3
          In these versions, this setting defaults to `100MB`.
```

### Inline badges in descriptions

Use inline tags in the description for version-scoped behavior that is not the `default` field. Do not use this pattern to replace `default`.

```yaml
description: |
  Shows the example control in the editor.

  {applies_to}`stack: ga 9.5+` The control is also available in Discover.
```

### Gated notes

The `note`, `tip`, `warning`, and `important` fields already render as admonitions. Do not wrap them in `:::{note}`.

To show a badge on that admonition, put `:applies_to:` on the first line of the field. The next line is the note body.

Previous default (keep `default` as the current value):

```yaml
        default: false
        note: |
          :applies_to: stack: ga 9.2-9.3
          In these versions, this setting defaults to `true`.
```

Deployment-scoped:

```yaml
        note: |
          :applies_to: serverless: ga
          In Serverless, the list can include a maximum of 50 items.
```

More than one key:

```yaml
        note: |
          :applies_to: {stack: ga 9.5+, serverless: ga}
          Setting this value too high may cause timeouts.
```

Version-scoped caveat that is not a previous default:

```yaml
        note: |
          :applies_to: stack: ga 9.6+
          From this version, you can no longer turn the example feature on or off with this setting.
```

If `:applies_to:` is not the first line, the badge does not attach to the note. Use a gated note for a previous default, and for extra admonition prose such as a version-scoped caveat. When a note already exists or when a note would complicate the reading flow, to not pile them up, it's ok to use inline applies_to in the description instead.

### Version syntax

Tag `stack` at the minor: `ga 9.4+`, not `ga 9.4.2`. Prefer `x.x+` for open-ended availability. Prefer an explicit range for a closed lifecycle: `preview 9.0-9.2`, not a bare `preview 9.0` next to a later state. Do not put a version on deployment keys or on `serverless`.

A `vX.Y.Z` label on a Kibana PR is a backport target. Confirm the patch shipped before you use that minor as the floor.

## Description style

Write for the person who sets the value. For `kibana.yml`, that is an operator. For Advanced Settings, that is someone using the {{kib}} UI.

Lead with the effect. Then say how to set it.

Do:

- Say what changes in {{kib}} or on the deployment when the value changes.
- For a boolean, say what `true` and `false` do.
- For a limit or duration, include the unit.
- Bold the Advanced Settings UI label when you mention that control.
- Link related settings.
- Use substitutions such as `{{kib}}` and `{{es}}`.

Do not:

- Restate the key as the whole description, for example "The `xpack.example.enabled` setting enables the example feature."
- Copy the PR title, issue wording, or i18n `name` string as the description.
- Name TypeScript symbols, test IDs, or plugin IDs.
- Repeat `datatype` or the current `default` in the description. Those render as their own fields. Put a previous default in a gated `note`. If values differ per version, say that in a gated note or with inline `{applies_to}`, not by restating the rendered **Default** or **Datatype** field.
- Put version numbers in the description next to a badge.

Keep one idea per sentence. Use the active voice. Verify every claim against the implementation at HEAD.

Wrong:

```yaml
        description: |
          Feature flag consumed by ExampleService. See `enableFeature` in `plugin.ts`.
```

Right:

```yaml
        description: |
          Turns the example feature on in {{kib}}. Set to `false` to turn it off.
```
