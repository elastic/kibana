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

After new files, **do not run `yarn kbn bootstrap` yourself** — Cursor's shell sandbox will cause partial failures and break other packages. Instead, tell the user:

> "All files are written. Please run the following in your terminal, then open Kibana:
> ```
> yarn kbn bootstrap
> yarn start --run-examples
> ```"

Do **not** use `plugins/` + `node scripts/generate_plugin` for throwaway prototypes (use `examples/` + `--run-examples`).

### Implement UI

Follow the plan’s table from [eui-vs-kbnui.md](eui-vs-kbnui.md) — use listed wrappers, never `EuiPageTemplate` in Kibana.

| Topic | Guidance |
|-------|----------|
| Components | Raw EUI per plan; kbn-ui / shared-ux packages per [eui-vs-kbnui](eui-vs-kbnui.md) |
| Styling | `@emotion/react`; theme tokens over raw hex |
| Layout | [kbn-ui README](../../../../src/platform/kbn-ui/README.md); side nav → [side-navigation](../../../../src/platform/kbn-ui/side-navigation/README.md) |
| Copy | Sentence case, EUI voice |
| a11y | Keyboard, labels, contrast per design |
| Data | In-repo mocks unless plan says live data |

**Avoid introducing third-party dependencies.** Before reaching for an npm package, search the repo for an existing solution:

- Canvas pan/zoom → `x-pack/solutions/security/plugins/security_solution/public/resolver/` (div + CSS transform + SVG edges; no CSP issues)
- Graph/DAG layout → hardcode positions or copy the Resolver's camera math; do not use `@xyflow/react`, `dagre`, or similar
- Data grids → `EuiDataGrid` or `EuiBasicTable`
- Charts → `@elastic/charts` (already in the repo)

If a package is already in `package.json`, it may still conflict with Kibana's strict CSP (`script-src`, `style-src`) or webpack config. Always verify a pattern already works in the repo before using a new dependency.

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

> **Do not run `node scripts/type_check` for example prototypes.** The full compiler walks the entire `kbn_references` chain, takes 5–20 min, and surfaces pre-existing errors from unrelated packages — producing noise with no signal for a not-for-merge prototype. The optimizer's successful bundle build (visible in the Kibana terminal as `[N/N] initial bundle builds complete`) is sufficient proof that the code compiles.

## Handoff

→ [run-kibana](run-kibana.md) · [ingest-data](ingest-data.md) · [build-version-panel](build-version-panel.md) if applicable

## Troubleshooting

| Symptom | Action |
|---------|--------|
| App missing from nav | `--run-examples`; `developerExamples` in `requiredPlugins` |
| Optimizer / types | `yarn kbn bootstrap`; fix `kbn_references` in `tsconfig.json` |
| Empty UI | Mocks or [ingest-data](ingest-data.md) |