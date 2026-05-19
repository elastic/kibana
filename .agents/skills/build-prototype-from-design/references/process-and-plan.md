# Process design and plan

Step 1 — read the design, decide what to build, and produce a short plan **before** writing code.

## Inputs

| Input | Action |
|-------|--------|
| **Figma URL** | Figma MCP: `get_design_context`, `get_screenshot`, `get_variable_defs`. No raw HTTP for figma.com. |
| **Screenshot / image** | Layout, hierarchy, states, copy; request Figma if pixel fidelity matters. |
| **Text / brief** | Screens, flows, constraints, open questions. |

## Agent flow

### A. Understand the design

1. **Scope** — screen(s), user flow, states (default, loading, empty, error).
2. **EUI vs kbn-ui** — classify every element using **[eui-vs-kbnui.md](eui-vs-kbnui.md)** (routing table + flowchart). Default: raw EUI.
3. **Kibana surface** — chrome vs application workspace ([kbn-ui layout](../../../../src/platform/kbn-ui/README.md)); which solution (Search, Observability, Security).
4. **Data** — mock vs live indices → step 4 [ingest-data](ingest-data.md).
5. **Versions** — multiple iterations? → step 5 [build-version-panel](build-version-panel.md).

Use **AskQuestion** when intent is ambiguous.

### B. Map elements (required output)

Follow [eui-vs-kbnui.md](eui-vs-kbnui.md). Record:

`| Element | Raw EUI | Kibana wrapper (package) | Notes |`

If unsure after the flowchart, search:

```sh
rg -l "<keyword>" src/platform/packages/shared/shared-ux/ src/platform/kbn-ui/ --glob '*.{ts,tsx}'
```

Do not invent wrappers. Do not use `EuiPageTemplate` in Kibana apps.

### C. Decide how to host it in Kibana

| Situation | Plan → step 2 path |
|-----------|-------------------|
| New screen / isolated prototype / version compare | **`new_plugin`** — `examples/<snake_case>/` |
| Small change in an existing **example** | **`tweak_example`** |
| Change in a **production** app | **`tweak_app`** — only if user insists |

Default: **`new_plugin`**.

### D. Plan output (confirm with user)

- Host path + plugin id (if new)
- **EUI vs kbn-ui table** (from [eui-vs-kbnui.md](eui-vs-kbnui.md))
- Chrome: global shell vs in-app only (do not prototype global chrome unless scoped)
- States to build (default first)
- Data: mock vs [ingest-data](ingest-data.md) choice
- Multiple versions? → [build-version-panel](build-version-panel.md)

## Handoff

→ [implement.md](implement.md)