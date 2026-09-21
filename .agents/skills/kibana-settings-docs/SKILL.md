---
name: kibana-settings-docs
description: Document Kibana kibana.yml settings and Advanced Settings (uiSettings) in docs-builder {settings} YAML for public user documentation. Use when adding, changing, deprecating, or removing a kibana.yml key, uiSettings.register, uiSettings.registerGlobal, advanced-settings-space.yml, advanced-settings-global.yml, or a docs/reference/configuration-reference YAML file.
# `disable-model-invocation` is Cursor-specific. Other agent runtimes that
# consume `.agents/skills/` may ignore it. Invoke this skill explicitly when
# the task is settings YAML.
disable-model-invocation: true
---

# Kibana settings docs

Document every user-facing `kibana.yml` setting and Advanced Settings (`uiSettings`) entry in `{settings}` YAML. Do not write the reference as freeform Markdown.

Schema, `applies_to`, description style, the `default` field, gated notes, and lifecycle history live in docs-builder: [automated settings](https://github.com/elastic/docs-builder/blob/main/docs/syntax/automated_settings.md) and [settings-with-applies-example.yml](https://github.com/elastic/docs-builder/blob/main/docs/syntax/settings-with-applies-example.yml).

This YAML does not follow the usual `docs-applies-to-tagging` lifecycle-symmetry rule. Read the settings page, not that skill.

Implementation tutorials stay in `docs/extend/tutorials/configuring-your-plugin.md` and `docs/extend/tutorials/ui-settings.md`. This skill covers the docs YAML only.

## Classify

| User changes it in | Code signal | Docs YAML |
|---|---|---|
| `kibana.yml` or Cloud **Edit user settings** | Plugin `config` schema, `configPath` in `kibana.jsonc` | `docs/reference/configuration-reference/<area>-settings.yml` |
| **Stack Management → Advanced Settings → Space Settings** | `uiSettings.register()` (default `scope: 'namespace'`) | `docs/reference/advanced-settings-space.yml` |
| **Advanced Settings → Global Settings** | `uiSettings.registerGlobal()` or `scope: 'global'` | `docs/reference/advanced-settings-global.yml` |

If the PR adds both a config-schema field and a `uiSettings` registration, document both. They are different settings.

A setting can exist in both places only when `kibana.yml` uses `uiSettings.overrides` to lock an Advanced Settings key. Document the `uiSettings` key in the Advanced Settings YAML. Document `uiSettings.overrides` itself in general settings YAML if that key changed.

Do not document a `kibana.yml` key in the Advanced Settings YAML. Do not document a `uiSettings` key in configuration-reference YAML.

## Workflow

```
Task progress:
- [ ] 1. Classify kibana.yml vs space vs global
- [ ] 2. Grep docs/reference and {settings} includes for the collection
- [ ] 3. Read the registration for key, type, default, category, and availability
- [ ] 4. Copy the nearest valid sibling
- [ ] 5. Tag applies_to from the docs-builder settings page
- [ ] 6. Check kibana.yml ech against the Cloud user-settings allowlist
- [ ] 7. Preview the Supported on line
- [ ] 8. If users need instructions, open a docs-content issue or PR
```

### Find the YAML file

```bash
git grep -n -- '<prefix-or-key>' HEAD -- docs/reference
```

If a matching group already exists, add the entry there. Match the surrounding entries.

Resolve `configPath` from the plugin `kibana.jsonc`. `["xpack", "spaces"]` plus schema field `maxSpaces` is `xpack.spaces.maxSpaces`.

Most edits stay in an existing YAML file. The host `.md` file already includes it with `{settings}`. Create a new YAML plus host Markdown only when no file documents that prefix:

- Add `docs/reference/configuration-reference/<area>-settings.md` with `{settings}` pointing at the new YAML.
- Add the page under `docs/reference/toc.yml` → `configuration-reference.md`.
- Reporting settings already split across several YAML files included from `reporting-settings.md`. Add to the matching include, not a new page.

Do not invent an Advanced Settings `group` name. Place the entry in the group that matches `category` in code. If `category` is omitted, the setting lands in General in the UI. If the UI adds a new category, add a matching `group` with an `id`. Keep order close to the UI.

Do not add YAML for internal flags, test-only config, or a rename that a documented deprecation already covers.

### Verify against source

Do not copy defaults, types, or availability from the issue body or PR title.

If this branch adds, changes, or removes the setting, read the implementation on this branch. Otherwise read Elastic `main`. If `origin` is your fork, fetch `upstream/main`. If `origin` is `elastic/kibana`, fetch `origin/main`.

```bash
git grep -n -- '<setting.key>' HEAD -- '*.ts' '*.tsx'
```

| Claim | kibana.yml source | Advanced Settings source |
|---|---|---|
| Key | `configPath` + schema field path | Object key in `register` / `registerGlobal` |
| Default | `schema.*({ defaultValue })` | `value` or `getValue` |
| Type | Schema type | `schema` plus optional `type` |
| Options | `schema.oneOf` / literals | `options` / `optionLabels` |
| Availability | `offeringBasedSchema`, `schema.contextRef('serverless')`, Cloud support | Serverless allowlists and `technicalPreview` / `experimental` / `deprecation` |
| UI category / group | n/a | `category` array. YAML `group` title. |

The `setting` value must match the runtime key. Quote keys that contain a colon, for example `"dateFormat:tz"`. The `name` i18n string is the UI label. It is not the YAML `setting` key.

Copy the nearest sibling. Change only what this setting needs. Include `datatype` and `default` when the source defines them. Copy the `datatype` term the surrounding file already uses. Include `id` when the generated slug would collide or stay unreadable.

### applies_to lookups

Read the docs-builder settings page, then fill Kibana-only values from source:

- **`kibana.yml` `ech`:** grep the Elastic Cloud Hosted user-settings allowlist in a local `elastic/cloud` clone, under `scala-services/adminconsole/src/main/resources/settings/kibana/`. Write `ech: ga` if the key is listed. Write `ech: unavailable` if it is not. Do not use `node scripts/check_kibana_settings.js` for this. That CLI only lists Kibana config keys. It does not read the Cloud allowlist. Do not infer support from the published Cloud settings page. That page is generated from this YAML.
- **Advanced Settings `ech`:** those keys are not on the Cloud user-settings allowlist. Follow the docs-builder deployment keys. The allowlist grep is for `kibana.yml` only.
- If Elastic Cloud Hosted should list the setting, include the YAML from `docs/reference/cloud/elastic-cloud-kibana-settings.md` with `:deployment: ech`. That filter shows a setting only when the entry has `ech: ga`.
- **Advanced Settings `serverless`:** start at `src/platform/packages/shared/serverless/settings/common/index.ts`. If the ID is there, write `serverless: ga`. If it is not, grep `observability_project`, `security_project`, `search_project`, and `vectordb_project` in that folder. Ignore `workplace_ai_project`. Follow each allowlist's imports to resolve the constant to the runtime key, including IDs exported from packages other than `kbn-management/settings/setting_ids`. Map `observability_project` to `observability`, `security_project` to `security`, `search_project` to `elasticsearch`, and `vectordb_project` to `vectordb`. If the ID is only on some of those four lists, nest those keys. If it is on none, write `serverless: unavailable`.
- **`kibana.yml` `serverless`:** use `offeringBasedSchema` or `schema.contextRef('serverless')`. Write a scalar `serverless: ga` or `serverless: unavailable`.

### Preview

```bash
docs-builder
docs-builder serve
```

On a Kibana PR: `https://docs-v3-preview.elastic.dev/elastic/kibana/pull/<n>/reference/kibana/<page>/`

YAML that parses is not proof that badges render. Inspect the setting's `<dd>` for `dd > p.settings-supported-on`.

### How-to follow-up

If users need instructions beyond the reference entry:

1. Search published docs with the `elastic-docs` MCP (`search_docs` or `find_related_docs`).
2. Open an `elastic/docs-content` issue, or an accompanying PR on the page that already covers that workflow.

Skip this when the reference entry is enough.

## Verification

- [ ] YAML file matches kibana.yml vs space vs global
- [ ] `setting` matches the runtime key at HEAD
- [ ] Description, `default`, `applies_to`, and lifecycle follow the docs-builder settings page
- [ ] kibana.yml `ech` matches the Cloud user-settings allowlist in `elastic/cloud`
- [ ] Advanced Settings `serverless` matches `common/index.ts` or the nested project allowlists, following each file's imports
- [ ] No UI label, test ID, or component name used as the YAML `setting` key
