# Process design and plan

Step 1 — read the design, decide what to build, and produce a short plan **before** writing code.

## Inputs

| Input | Action |
|-------|--------|
| **Figma URL** | Verify Figma MCP is running, then call `get_design_context`, `get_code_connect_map`, `get_variable_defs`. Full MCP setup + workflow: [figma-to-eui.md](figma-to-eui.md). |
| **Screenshot / image** | Use visual recognition table in [figma-to-eui.md](figma-to-eui.md) to map elements to EUI components. Request Figma URL if pixel fidelity matters. |
| **Text / brief** | Screens, flows, constraints, open questions. |

## Agent flow

### A. Understand the design

Before analyzing further, use **AskQuestion** to ask the user the three elicitation questions below — all three together in a single message. If any answer is already clear from the design or context, skip that question and record the assumption in the plan output (section D). Do not ask follow-up questions; for anything still ambiguous after this single round, make a reasonable assumption and surface it in the plan.

- **Q1 — What are we building?** State your best guess from the design and ask the user to confirm; do not present a blank list. Options:
  - A. New plugin / full page
  - B. New page in existing plugin
  - C. New component or panel
  - D. Replacing an existing component
- **Q2 — Which solution should this live in?** State a best guess if it is inferable from the design. Options:
  - A. Observability
  - B. Security
  - C. Search
  - D. None / standalone prototype
- **Q3 — Is Kibana already running locally?** Present as a plain choice (this cannot be inferred from a design). Options:
  - A. Yes
  - B. No
  - C. Not sure

Then continue:

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

- **Assumptions** — any question from section A that was skipped or left ambiguous, with the assumption you are making (e.g. "Assumed solution = Observability based on the design").
- Host path + plugin id (if new)
- **EUI vs kbn-ui table** (from [eui-vs-kbnui.md](eui-vs-kbnui.md))
- Chrome: global shell vs in-app only (do not prototype global chrome unless scoped)
- States to build (default first)
- Data: mock vs [ingest-data](ingest-data.md) choice
- Multiple versions? → [build-version-panel](build-version-panel.md)

## Handoff

→ [implement.md](implement.md)