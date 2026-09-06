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

If you are unsure, search the implementation on this checkout:

```bash
git grep -n -- '<setting.key>' HEAD -- '*.ts' '*.tsx'
```

If this branch does not add or change the setting, also grep Elastic `main`. If `origin` is `elastic/kibana`, that ref is `origin/main`. If you work from a fork, that ref is `upstream/main`.

Look for `schema.object({` / `configPath` (`kibana.yml`) versus `uiSettings.register` / `registerGlobal` (Advanced Settings).

A setting can exist in both places only when `kibana.yml` uses `uiSettings.overrides` to lock an Advanced Settings key. Document the `uiSettings` key in the Advanced Settings YAML. Document `uiSettings.overrides` itself in general settings YAML if that key changed.

Do not document a `kibana.yml` key in the Advanced Settings YAML. Do not document a `uiSettings` key in configuration-reference YAML.

## Workflow

Copy this checklist and complete it in order:

```
Task progress:
- [ ] 1. Classify kibana.yml vs space vs global
- [ ] 2. Find the YAML file (grep, then [file-map.md](references/file-map.md))
- [ ] 3. Verify key, default, type, and availability from the upstream origin/main, or from the current branch if that's where the setting itself is being added, modified, or removed
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
git grep -n -- '<prefix-or-key>' HEAD -- docs/reference
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
| Availability | `offeringBasedSchema`, `schema.contextRef('serverless')`, Cloud support | Serverless allowlist: start at `src/platform/packages/shared/serverless/settings/common/index.ts`. Also `technicalPreview` / `experimental` / `deprecation` |
| UI category / group | n/a | `category` array. YAML `group` title. |

If this branch adds, changes, or removes the setting, read the implementation on this branch. Otherwise read Elastic `main`. If `origin` is your fork, fetch `upstream/main`. If `origin` is `elastic/kibana`, fetch `origin/main`. Do not rely on the issue body, the PR title, or an old local branch.

The `setting` value must match the runtime key. Quote keys that contain a colon, for example `"dateFormat:tz"`.

The `name` i18n string is the UI label. It is not the YAML `setting` key.

### 4. Edit the YAML

Follow [yaml-schema.md](references/yaml-schema.md). Copy the nearest sibling entry and change only what this setting needs. If the product removes a setting that existed on Stack, keep the YAML entry and update `applies_to`. Do not delete it. If the setting existed only on serverless and is removed, delete the YAML entry.

Do not copy a missing `default` from a sibling that lists old defaults in the description. If this setting's source defines a default, keep the `default` field.

Required on every setting:

- `setting`
- `description` (Markdown)
- `applies_to`

Include `datatype` and `default` when the source defines them. Include `id` when the key would produce an ugly or colliding anchor.

`default` is the current product value at HEAD. Never omit it to encode an earlier value. Put a previous default in a gated `note`. See [yaml-schema.md](references/yaml-schema.md#the-default-field).

The `description` is user-facing. Lead with what the setting does for the reader. Follow [Description style](references/yaml-schema.md#description-style).

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

This YAML does **not** follow the usual `docs-applies-to-tagging` lifecycle-symmetry rule. Details and examples: [yaml-schema.md](references/yaml-schema.md). Canonical authoring contract: [docs-builder#4014](https://github.com/elastic/docs-builder/pull/4014) (`applies_to` in settings YAML). After that PR merges, use the [automated settings](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md#settings-yaml) section.

- **`stack`** is the only key that carries lifecycle and version:
  - Omit the version if the setting was added before 9.0: `stack: ga` or `stack: preview`. That means all 9.0+ versions.
  - A new setting should include a version, for example `stack: ga 9.5+`.
  - Omit the version only if the setting already existed in the product before 9.0 and was missing from the docs.
  - If you add a version that is not released yet, keep it. Docs show Planned until it ships. Do not omit a version to avoid Planned.
- **`stack` accepts multiple values.** Append a new lifecycle. Do not replace the old one. Example: `stack: preview 9.0-9.2, ga 9.3+`.
- **If the setting existed on Stack, keep a removed entry.** Users on earlier versions still need to find it. Append `removed` and the version: `stack: ga 9.0-9.3, removed 9.4+`. If the setting existed only on serverless and is removed, delete the YAML entry. Serverless has no version history.
- **Deployment keys** (`ech`, `ece`, `eck`, `self`) only name where the setting is supported. Always list all four:
  - Write `<key>: ga` if that deployment supports it, even when `stack` is `preview` or `removed`.
  - Write `<key>: unavailable` if that deployment does not support it. docs-builder does not render that badge.
  - For `ech`, check the Elastic Cloud Hosted user-settings allowlist first. That list lives in the `cloud` repository.
  - `packages/kbn-check-kibana-settings-cli` compares Kibana keys against it.
  - Write `ech: ga` if the key is on the list. Write `ech: unavailable` if it is not.
  - Do not infer support from the published Cloud settings page. That page is generated from this YAML.
  - Do not copy the stack lifecycle onto deployments.
  - Do not write a version on those keys.
- **`serverless`:** write `serverless: ga` when the setting exists on every serverless project. Write `serverless: unavailable` when it exists on none. Do not put a version on `serverless`. Never write `preview`, `experimental`, `deprecated`, or `removed` on `serverless` or on nested project keys.
  - For Advanced Settings, check `src/platform/packages/shared/serverless/settings/common/index.ts`. That file lists settings on every serverless project. If the ID is there, write `serverless: ga`.
  - If the ID is not in `common`, grep the project files in that folder: `observability_project`, `security_project`, `search_project`, and `vectordb_project`. Ignore `workplace_ai_project`. That project type never shipped, and docs-builder has no `workplace_ai` key.
  - Those files use ID constants such as `DATE_FORMAT_ID`, not the YAML key. Resolve the constant in `src/platform/packages/shared/kbn-management/settings/setting_ids/index.ts`.
  - If the ID is only on some projects, nest those project keys under `serverless`. Map `observability_project` to `observability`, `security_project` to `security`, `search_project` to `elasticsearch`, and `vectordb_project` to `vectordb`. Write `ga` on the keys that match. Do not write a scalar `serverless: ga`.
  - If the ID is not on any of those four lists, write `serverless: unavailable`.
  - For `kibana.yml`, keep using `offeringBasedSchema` or `schema.contextRef('serverless')`. Write a scalar `serverless: ga` or `serverless: unavailable`.
- **Gated notes:** To scope a `note`, `tip`, `warning`, or `important` to a version or deployment, put `:applies_to:` on the first line of that field. Do not wrap the field in `:::{note}`. Use a gated note for a previous default, and for extra admonition prose. Use inline `{applies_to}` in the description for other version-scoped behavior. Keep `default` as the current HEAD value.

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
- [ ] Description says what the setting does for the user. It does not describe the code
- [ ] Default and datatype match the schema or `uiSettings` registration at HEAD
- [ ] `default` is present when the source defines a value. An earlier default is in a gated `note`, not in place of `default`
- [ ] `stack` has no version only when the setting was added before 9.0
- [ ] New settings include a version, unless the key already existed before 9.0 and was missing from the docs
- [ ] Deployment keys are always listed. Use `ga` or `unavailable`
- [ ] For Advanced Settings, `serverless` matches `common/index.ts` or the nested project keys from the project allowlists
- [ ] If you add a version that is not released yet, keep it. Do not strip it to avoid Planned
- [ ] Lifecycle changes append on `stack` (for example `preview 9.0-9.2, ga 9.3+`). They do not replace the previous value
- [ ] Removed Stack settings stay in the YAML with `removed` and a version on `stack`. A serverless-only setting that is removed is deleted from the YAML
- [ ] `ech: ga` only if the Elastic Cloud Hosted user-settings allowlist includes the key
- [ ] Cloud page include exists only if the entry has `ech: ga`
- [ ] If a note is version- or deployment-scoped, `:applies_to:` is the first line of that field
- [ ] No UI label, test ID, or component name used as the YAML `setting` key

## Additional resources

- YAML field reference and `applies_to` rules: [yaml-schema.md](references/yaml-schema.md)
- File and group map: [file-map.md](references/file-map.md)
- Copy-paste entries: [examples.md](examples.md)
- Schema source: [automated settings](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md). Settings `applies_to` contract: [docs-builder#4014](https://github.com/elastic/docs-builder/pull/4014)
- Badge rendering: [applies-to badge reference](https://elastic.github.io/docs-builder/syntax/applies/#badge-rendering-reference)
