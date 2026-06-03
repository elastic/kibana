# PR Title

**[Workflows] Tech preview badges in YAML editor autocomplete and hovers**

---

# Description

## Summary

Surfaces tech preview (and beta) stability in the workflow YAML editor, aligned with the actions menu `EuiBetaBadge` UX:

- **Autocomplete (suggest widget):** Injects a flask badge on tech-preview steps, triggers, built-in steps, extension steps, and dynamic connectors via aria-label–scoped CSS (same injection pipeline as connector icons).
- **Hover popovers:** Prepends a theme-aware SVG badge (DOMPurify-safe `data:image/svg+xml` img) for non-GA steps, connectors, and custom triggers — top-left, matching actions menu placement.
- **Shared stability module:** Extracts `lib/stability/` (`get_stability_badge_html`, `get_extension_step_stability`, theme context) and re-exports via `get_stability_note.ts` barrel.
- **Extension steps:** Unmarked registered steps default to tech preview; stable steps show no badge.
- **Theme:** Seeds EUI theme on editor mount and refreshes on icon injection so hover badges follow light/dark mode.

Built-in step suggest `detail` no longer appends “(Tech Preview)” — the flask badge carries that signal instead.

## Not in scope / follow-ups

- Beta stability in suggest list (hover shows beta badge; suggest flask is tech-preview only today).
- Custom trigger stability is hardcoded to tech preview until `PublicTriggerDefinition.stability` is wired.
- Scout/UI integration test for Monaco suggest + hover (unit tests cover handlers and badge HTML).

## Test plan

- [ ] Open workflow YAML editor; trigger autocomplete on `workflow.execute` — suggest row shows flask badge.
- [ ] Autocomplete a custom extension step (tech preview) — flask badge appears on suggest row.
- [ ] Autocomplete a custom trigger — flask badge on suggest row.
- [ ] Hover a tech-preview step type — “Tech preview” SVG badge appears above hover body (not brand-blue text).
- [ ] Hover a beta Kibana/Elasticsearch connector — “Beta” badge appears.
- [ ] Toggle light/dark theme — hover badge colors update.
- [ ] Unit tests:
  ```bash
  node scripts/jest src/platform/plugins/shared/workflows_management/public/widgets/workflow_yaml_editor/lib/stability/
  node scripts/jest src/platform/plugins/shared/workflows_management/public/widgets/workflow_yaml_editor/lib/monaco_connectors/
  node scripts/jest src/platform/plugins/shared/workflows_management/public/widgets/workflow_yaml_editor/lib/autocomplete/suggestions/collect_tech_preview_suggest_aria_prefixes.test.ts
  ```
