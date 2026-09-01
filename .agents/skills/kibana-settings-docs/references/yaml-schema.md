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
          serverless: unavailable
```

### Fields on a setting

| Field | Role |
|---|---|
| `setting` | Runtime key. Quote keys with colons. |
| `description` | Markdown. Links, substitutions, inline `{applies_to}`, admonitions, and dropdowns are allowed. |
| `id` | HTML anchor. Set it when the generated slug would collide or stay unreadable. |
| `datatype` | Shown as **Datatype**. See mapping below. |
| `default` | Shown as **Default**. Match source. Quote strings that YAML would otherwise mistype. |
| `options` | Enum values: `option` plus optional `description`. |
| `applies_to` | Availability. Required for new entries. |
| `note`, `tip`, `warning`, `important` | Admonitions on the setting. |
| `deprecation_details` | Extra deprecation prose. Pair with `applies_to` lifecycle `deprecated`. |
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

Preferred map form (matches docs-builder examples):

```yaml
applies_to:
  stack: ga 9.4+
  ech: ga
  ece: ga
  eck: ga
  self: ga
  serverless: ga
```

Some existing files use a list of strings:

```yaml
applies_to:
  - "stack: preview"
  - "ech: unavailable"
  - "self: ga"
```

Match the file. Do not convert a whole file from list to map in the same PR as a setting add.

### Keys this repo uses on settings

- `stack` for Elastic Stack version and lifecycle
- `ech`, `ece`, `eck`, `self` as deployment keys at the same level (not nested under `deployment:`)
- `serverless` on Advanced Settings entries and on dual-audience pages

`ech` is Elastic Cloud Hosted. Do not add new `ess` keys.

### Cloud filter

`docs/reference/cloud/elastic-cloud-kibana-settings.md` includes YAML with `:deployment: ech`.

docs-builder shows a setting on that page when `applies_to.ech` is present and not `removed`. Treat `ech: unavailable` as hidden. Settings with no `applies_to` at all are always shown. Always set `applies_to`.

### Lifecycle symmetry

`stack` and the Stack deployments are the same product surface. Align their lifecycles.

Wrong:

```yaml
applies_to:
  stack: experimental
  ech: ga
  self: ga
```

Right:

```yaml
applies_to:
  stack: experimental
  ech: experimental
  ece: experimental
  eck: experimental
  self: experimental
  serverless: unavailable
```

If Cloud truly is GA while self-managed is experimental, split the description. Do not put contradictory badges on one entry.

### Unreleased version drops the Supported on line

If `stack` has a single lifecycle whose version is not released yet, docs-builder treats it as Planned. The settings component then omits the entire `p.settings-supported-on` line. Deployment badges on the same entry disappear too.

| Tag while 9.5 is unreleased | Result |
|---|---|
| `stack: preview 9.5` as the only stack value | No Supported on line |
| `stack: preview` (no version) | Line renders (Preview) |
| `stack: preview 9.4` when 9.4 is released | Line renders (Preview 9.4+) |
| `stack: preview 9.4, ga 9.5` | Follow the badge table. Do not use this to hide a contradiction. |

If the setting is already preview on the current released stack, omit the unreleased version. If it is truly new in the unreleased minor, either omit the version until that minor ships, or accept the missing line on the PR preview.

Rules: [badge rendering reference](https://elastic.github.io/docs-builder/syntax/applies/#badge-rendering-reference).

### Inline badges in descriptions

Use inline tags for per-version defaults inside the description, not for the entry's overall availability:

```yaml
description: |
  The default value depends on your version:

  * {applies_to}`stack: ga 9.5+` Defaults to `system`.
  * {applies_to}`stack: ga 9.0-9.4` Defaults to `disabled`.
```

### Version syntax

Tag at the minor: `ga 9.4+`, not `ga 9.4.2`. Prefer `x.x+` for open-ended availability. Serverless is unversioned: `serverless: ga`.

A `vX.Y.Z` label on a Kibana PR is a backport target. Confirm the patch shipped before you use that minor as the floor.

## Description style

Write for operators and admins. Use the Elastic style guide. Use substitutions such as `{{kib}}` and `{{es}}`.

Do not paste PR titles or issue wording. Do not name TypeScript symbols, test IDs, or plugin IDs.

Bold UI labels when you mention the Advanced Settings control. The YAML `setting` key stays in backticks.

Keep one idea per sentence. Prefer the active voice.
