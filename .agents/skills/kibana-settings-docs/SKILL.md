---
name: kibana-settings-docs
description: Document Kibana kibana.yml settings and Advanced Settings (uiSettings) in docs-builder {settings} YAML for public user documentation. Use when adding, changing, deprecating, or removing a kibana.yml key, uiSettings.register, uiSettings.registerGlobal, advanced-settings-space.yml, advanced-settings-global.yml, or a docs/reference/configuration-reference YAML file.
---

# Kibana settings docs

Document every user-facing `kibana.yml` setting and Advanced Settings (`uiSettings`) entry in this repo. The published pages are generated from YAML. Do not write the reference as freeform Markdown.

Implementation tutorials stay in:

- `docs/extend/tutorials/configuring-your-plugin.md` for `kibana.yml` schema
- `docs/extend/tutorials/ui-settings.md` for `uiSettings` registration

This skill covers the docs YAML only.

## Classify first

| User changes it in | Code signal | Docs YAML | Published page |
|---|---|---|---|
| `kibana.yml` or Cloud **Edit user settings** | Plugin `config` schema, `configPath` in `kibana.jsonc` | `docs/reference/configuration-reference/<area>-settings.yml` | [Configuration reference](https://www.elastic.co/docs/reference/kibana/configuration-reference) |
| **Stack Management → Advanced Settings → Space Settings** | `uiSettings.register()` (default `scope: 'namespace'`) | `docs/reference/advanced-settings-space.yml` | [Advanced settings](https://www.elastic.co/docs/reference/kibana/advanced-settings) |
| **Advanced Settings → Global Settings** | `uiSettings.registerGlobal()` or `scope: 'global'` | `docs/reference/advanced-settings-global.yml` | Same page, **Change the global settings** |

If you are unsure, search the implementation:

```bash
git grep -n -- '<setting.key>' origin/main -- '*.ts' '*.tsx'
```

Look for `schema.object({` / `configPath` (`kibana.yml`) versus `uiSettings.register` / `registerGlobal` (Advanced Settings).

A setting can exist in both places only when `kibana.yml` uses `uiSettings.overrides` to lock an Advanced Settings key. Document the `uiSettings` key in the Advanced Settings YAML. Document `uiSettings.overrides` itself in general settings YAML if that key changed.

Do not document a `kibana.yml` key in the Advanced Settings YAML. Do not document a `uiSettings` key in configuration-reference YAML.

## Workflow

Copy this checklist and complete it in order:

```
Task progress:
- [ ] 1. Classify kibana.yml vs space vs global
- [ ] 2. Find the YAML file (grep, then [file-map.md](references/file-map.md))
- [ ] 3. Verify key, default, type, and availability from origin/main
- [ ] 4. Edit the YAML entry
- [ ] 5. Update host Markdown, toc.yml, or Cloud include only if needed
- [ ] 6. Tag applies_to (stack history + all deployment keys + serverless)
- [ ] 7. Preview and check the Supported on line
- [ ] 8. If users need instructions, find the how-to page and open a docs-content issue or PR
```

### 1. Classify

Use the table above. If the PR adds both a config-schema field and a `uiSettings` registration, document both. They are different settings.

### 2. Find the YAML file

Grep the existing YAML before you create a file:

```bash
git grep -n -- '<prefix-or-key>' origin/main -- docs/reference
```

If a matching group already exists, add the entry there. Match the surrounding entries. See [file-map.md](references/file-map.md) for prefixes, groups, and when a new YAML file is warranted.

### 3. Verify against source at HEAD

Do not copy defaults, types, or availability from the issue body or PR title.

| Claim | kibana.yml source | Advanced Settings source |
|---|---|---|
| Key | `configPath` + schema field path | Object key in `register` / `registerGlobal` |
| Default | `schema.*({ defaultValue })` | `value` or `getValue` |
| Type | Schema type | `schema` plus optional `type` |
| Options | `schema.oneOf` / literals | `options` / `optionLabels` |
| Availability | `offeringBasedSchema`, `schema.contextRef('serverless')`, Cloud support | Same, plus `technicalPreview` / `experimental` / `deprecation` |
| UI category / group | n/a | `category` array. YAML `group` title. |

Fetch `origin/main` first. Read the implementation at HEAD, not only the original PR diff.

The `setting` value must match the runtime key. Quote keys that contain a colon, for example `"dateFormat:tz"`.

The `name` i18n string is the UI label. It is not the YAML `setting` key.

### 4. Edit the YAML

Follow [yaml-schema.md](references/yaml-schema.md). Copy the nearest sibling entry and change only what this setting needs. If the product removes the setting, keep the YAML entry and update `applies_to`. Do not delete it.

Required on every setting:

- `setting`
- `description` (Markdown)
- `applies_to`

Include `datatype` and `default` when the source defines them. Include `id` when the key would produce an ugly or colliding anchor.

Place a new Advanced Settings entry in the group that matches `category` in code. Keep order close to the UI. The Advanced Settings page states that settings are ordered as they appear in Kibana.

### 5. Host Markdown, TOC, and Cloud include

Most edits stay in an existing YAML file. The host `.md` file already includes it with `{settings}`.

Create or update a host file only when you add a new YAML collection:

- Add `docs/reference/configuration-reference/<area>-settings.md` with `:::{settings} /reference/configuration-reference/<area>-settings.yml`.
- Add the page under `docs/reference/toc.yml` → `configuration-reference.md`.
- If Elastic Cloud Hosted should list the setting, include the YAML from `docs/reference/cloud/elastic-cloud-kibana-settings.md` with `:deployment: ech`.

That filter shows a setting only when the entry has `ech: ga`. `ech: unavailable` hides it. Decide `ech: ga` from the allowlist in step 6. A missing `applies_to` block shows the setting on the Cloud page. Always set `applies_to`.

Reporting settings already split across several YAML files included from `reporting-settings.md`. Add to the matching include, not a new page.

### 6. applies_to

This YAML does **not** follow the usual `docs-applies-to-tagging` lifecycle-symmetry rule. It also does not allow deleting a preview-only setting when that setting is removed. Details and examples: [yaml-schema.md](references/yaml-schema.md).

- **`stack`** is the only key that carries lifecycle and version:
  - No version means all versions: `stack: ga` or `stack: preview`.
  - A new setting should include a version, for example `stack: ga 9.5+`.
  - Omit the version only if the setting already existed in the product and was missing from the docs.
  - If you add a version that is not released yet, keep it. Docs show Planned until it ships. Do not omit a version to avoid Planned.
- **`stack` accepts multiple values.** Append a new lifecycle. Do not replace the old one. Example: `stack: preview 9.0-9.2, ga 9.3+`.
- **Do not delete a removed setting.** Keep the YAML entry so users on earlier versions can still find it. Append `removed` and the version: `stack: ga 9.0-9.3, removed 9.4+`.
- **Deployment keys** (`ech`, `ece`, `eck`, `self`) only name where the setting is supported. Always list all four:
  - Write `<key>: ga` if that deployment supports it, even when `stack` is `preview` or `removed`.
  - Write `<key>: unavailable` if that deployment does not support it. docs-builder does not render that badge.
  - For `ech`, check the Elastic Cloud Hosted user-settings allowlist first. That list lives in the `cloud` repository.
  - `packages/kbn-check-kibana-settings-cli` compares Kibana keys against it.
  - Write `ech: ga` if the key is on the list. Write `ech: unavailable` if it is not.
  - Do not infer support from the published Cloud settings page. That page is generated from this YAML.
  - Do not copy the stack lifecycle onto deployments.
  - Do not write a version on those keys.
- **`serverless`:** write `serverless: ga` when the setting exists on serverless. Write `serverless: unavailable` when it does not. Do not put a version on `serverless`.

Tag `stack` at the minor. Do not put version numbers in the description next to a badge.

### 7. Preview and badge check

Build locally from the repo root:

```bash
docs-builder
docs-builder serve
```

On a Kibana PR, open the docs preview:

`https://docs-v3-preview.elastic.dev/elastic/kibana/pull/<n>/reference/kibana/<page>/`

YAML that parses is not proof that badges render. Inspect the live DOM for the setting's `<dd>`:

- A rendered line is `dd > p.settings-supported-on` with `<applies-to-popover>` children.
- If `stack` names an unreleased version, the docs can show Planned until that minor ships. Do not strip that version.

### 8. How-to follow-up

The YAML in this repo is the setting reference. Users may also need instructions.

If the change needs new or updated how-to content:

1. Search published docs with the `elastic-docs` MCP (`search_docs` or `find_related_docs`).
2. Open an `elastic/docs-content` issue, or an accompanying PR on the page that already covers that workflow.

Skip this when the reference entry is enough.

## Verification checklist

- [ ] Entry is in the YAML that matches kibana.yml vs space vs global
- [ ] `setting` matches the runtime key at HEAD
- [ ] Default and datatype match the schema or `uiSettings` registration
- [ ] `stack` has no version only when the setting applies to all versions
- [ ] New settings include a version, unless the key already existed and was missing from the docs
- [ ] Deployment keys are always listed. Use `ga` or `unavailable`
- [ ] If you add a version that is not released yet, keep it. Do not strip it to avoid Planned
- [ ] Lifecycle changes append on `stack` (for example `preview 9.0-9.2, ga 9.3+`). They do not replace the previous value
- [ ] Removed settings stay in the YAML with `removed` and a version on `stack`
- [ ] `ech: ga` only if the Elastic Cloud Hosted user-settings allowlist includes the key
- [ ] Cloud page include exists only if the entry has `ech: ga`
- [ ] No UI label, test ID, or component name used as the YAML `setting` key

## Additional resources

- YAML field reference and `applies_to` rules: [yaml-schema.md](references/yaml-schema.md)
- File and group map: [file-map.md](references/file-map.md)
- Copy-paste entries: [examples.md](examples.md)
- Schema source: [automated settings](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md)
- Badge rendering: [applies-to badge reference](https://elastic.github.io/docs-builder/syntax/applies/#badge-rendering-reference)
