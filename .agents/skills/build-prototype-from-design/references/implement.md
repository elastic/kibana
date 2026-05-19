# Implement

Step 2 — write code from the [process-and-plan](process-and-plan.md) brief: **new example plugin** or **tweak** existing code.

**Not for merge.** Prefer `examples/`; use EUI + Emotion; skip tests unless asked.

**Canonical docs:** [Hello World](https://docs.elastic.dev/kibana-dev-docs/getting-started/hello-world-app) (`examples/hello_world`) · [Anatomy of a plugin](https://docs.elastic.dev/kibana-dev-docs/key-concepts/anatomy-of-a-plugin)

---

## Path A — New example plugin (`new_plugin`)

### Scaffold

Copy **`examples/hello_world`**. Layout:

```
examples/<plugin_folder>/
  kibana.jsonc
  tsconfig.json
  public/index.ts
  public/plugin.tsx
  public/application.tsx   # optional
  public/components/       # prototype UI
```

`kibana.jsonc` essentials: `type: plugin`, `id: @kbn/<name>-plugin`, `plugin.id` (camelCase), `browser: true`, `server: false` (default), `requiredPlugins: ["developerExamples"]`.

Register in `public/plugin.tsx`:

- `core.application.register({ id, title, mount })` — `id` = `plugin.id`
- `deps.developerExamples.register({ appId, title, description })`

After new files: `yarn kbn bootstrap` from repo root.

Do **not** use `plugins/` + `node scripts/generate_plugin` for throwaway prototypes (use `examples/` + `--run-examples`).

### Implement UI

Follow the **EUI vs KUI map** from [process-and-plan](process-and-plan.md); import KUI packages as listed, do not reimplement them with raw EUI.

| Topic | Guidance |
|-------|----------|
| Components | Plan’s EUI list → `@elastic/eui`; plan’s KUI list → `@kbn/ui-*` / `@kbn/shared-ux-*` |
| Styling | `@emotion/react`; theme tokens over raw hex |
| Layout | [kbn-ui README](../../../../src/platform/kbn-ui/README.md); side nav → [side-navigation](../../../../src/platform/kbn-ui/side-navigation/README.md) |
| Copy | Sentence case, EUI voice |
| a11y | Keyboard, labels, contrast per design |
| Data | In-repo mocks unless plan says live data |

**Order:** default state → other states in scope. Match Figma/screenshot before done.

**Reuse examples:**

| Area | Start here |
|------|------------|
| Search / Discover | `examples/search_examples` |
| Embeddables | `examples/embeddable_examples` |
| Side nav / chrome | `examples/sidebar_examples` |
| Flyouts | `examples/flyout_system` |
| Layout / grid | `examples/resizable_layout_examples`, `examples/grid_example` |

### Server (rare)

If APIs needed: `"server": true`, `server/index.ts` lazy-loads `./plugin` ([AGENTS.md](../../../../AGENTS.md)).

---

## Path B — Tweak existing code (`tweak_example` | `tweak_app`)

1. Open the target from the plan (example or app path).
2. Change only files needed for the design; match local patterns.
3. Same EUI / layout / a11y rules as Path A.
4. No new `kibana.jsonc` unless adding a small example variant.

---

## Checklist

- [ ] Matches plan host path (`new_plugin` vs tweak)
- [ ] EUI components from plan implemented
- [ ] `yarn kbn bootstrap` if new example package
- [ ] Ready for [run-kibana](run-kibana.md) with `--run-examples` (new plugin) or normal start (tweak only)

## Handoff

→ [run-kibana](run-kibana.md) · [ingest-data](ingest-data.md) · [build-version-panel](build-version-panel.md) if applicable

## Troubleshooting

| Symptom | Action |
|---------|--------|
| App missing from nav | `--run-examples`; `developerExamples` in `requiredPlugins` |
| Optimizer / types | `yarn kbn bootstrap`; fix `kbn_references` in `tsconfig.json` |
| Empty UI | Mocks or [ingest-data](ingest-data.md) |
