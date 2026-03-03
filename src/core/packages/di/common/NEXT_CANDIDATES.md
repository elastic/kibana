# Global DI: Next Candidate Dependencies

Evaluation of plugin dependency patterns that could benefit from the `Global` DI
approach demonstrated by the APM/SLO flyout PoC.

> **What's already on this branch:** The embeddable factory multi-binding pattern
> (similar to Options 3 and 4 below) has been demonstrated: `lens`, `dashboard_markdown`,
> and `image_embeddable` each bind `EmbeddableFactoryRegistration` globally, and the
> `embeddable` plugin collects them at startup via `container.getAll(...)`.  This
> validates the registry-to-DI approach at small scale.  The candidates below describe
> the next opportunities for broader adoption.

## Option 1: Cases ↔ APM (True Mutual Optional Pattern)

### The pattern

- `apm` optionally depends on `cases` to display case-related UI in the APM
  service view.
- `cases` optionally uses APM context at runtime (`apm` appears as MISSING from
  the `cases` manifest but is used in the optional start contract).

### Why it fits Global DI

This is an actual bidirectional dependency — both plugins want to render each
other's UI components or consume each other's services.  APM wants the Cases
creation flyout and Cases wants APM service context for enrichment.  This is
structurally identical to the APM/SLO pattern already solved: extract shared
tokens into a neutral package, have each plugin publish globally, and have each
plugin consume the other's token without a manifest declaration.

### Strengths

- Exact same shape as the solved APM/SLO case, making it a clean validation.
- True mutual dependency (not just one-way optional), which better demonstrates
  `Global` DI's core value proposition.

### Weaknesses

- The `cases` plugin has 13 consumers beyond APM (`securitySolution`,
  `timelines`, `infra`, `observability`, etc.), so the testing surface is larger.
- The Cases dependency from APM is relatively light (just a flyout), so the
  practical payoff per-plugin is modest.

---

## Option 2: Agent Builder (Many-to-One Service Consumption)

### The pattern

- `agentBuilder` is optionally consumed by 7 plugins (`apm`,
  `observabilityAIAssistantApp`, `observabilityAIAssistant`, `observability`,
  `searchHomepage`, `securitySolution`, `serverlessSearch`) and bundled by 2 more
  (`elasticAssistant`, `securitySolution`).
- `agentBuilder` depends back on `triggersActionsUi`, `lens`, and `inference`,
  meaning several of its consumers (`securitySolution`, `observability`) are in
  the dependency graph of things `agentBuilder` itself needs.

### Why it fits Global DI

Agent Builder exposes a conversation flyout/sidebar component that many plugins
want to embed.  The `securitySolution` → `agentBuilder` (optional) and
`agentBuilder` → `securitySolution` (bundle) relationship is nearly mutual.
Publishing the agent builder's public component (`openConversationFlyout`,
embedded chat) as a `Global` token would let any plugin consume it without the
optional dependency, and would break the near-circular with `securitySolution`.

### Strengths

- Highly relevant to current Kibana direction (AI everywhere).
- The pattern is "embed this chat component anywhere," which is the ideal
  `Global` DI use case.
- Involves cross-solution-group consumption (platform plugin consumed by
  security, observability, and search solutions).

### Weaknesses

- Agent Builder is evolving rapidly, so the contract surface may shift.
- The bundle-level dependency (`requiredBundles`) for `securitySolution` would
  still be needed for browser code loading even with `Global` DI — this is the
  browser bundle limitation documented in `GLOBAL_DI_ANALYSIS.md`.

---

## Option 3: Embeddable Drilldowns — Eliminating Bridge Plugins *(next priority)*

### Background

On `main`, the `embeddable` plugin contained drilldown management code and
depended on `uiActionsEnhanced`, while `uiActionsEnhanced` depended on
`embeddable`.  That was a direct cycle.

The current branch includes a refactoring that broke this cycle by extracting
two new "bridge" plugins:

- **`embeddableEnhanced`** — exposes `initializeEmbeddableDynamicActions`, the
  single function that wires drilldown support into an embeddable.
- **`dashboardEnhanced`** — hosts the dashboard-to-dashboard drilldown and the
  drilldown management flyout actions.

After the refactoring, `embeddable` no longer depends on `uiActionsEnhanced`.
The cycle is gone, but a new fan-out appeared: 7 plugins now optionally depend
on `embeddableEnhanced` solely to call one function.

### The pattern

```
Before (cycle):
  embeddable ──requires──▶ uiActionsEnhanced
  uiActionsEnhanced ──requires──▶ embeddable

After (bridge):
  embeddableEnhanced ──requires──▶ embeddable, uiActionsEnhanced
  lens ──optional──▶ embeddableEnhanced
  maps ──optional──▶ embeddableEnhanced
  discover ──optional──▶ embeddableEnhanced
  visualizations ──optional──▶ embeddableEnhanced
  slo ──optional──▶ embeddableEnhanced
  synthetics ──optional──▶ embeddableEnhanced
  imageEmbeddable ──optional──▶ embeddableEnhanced
  dashboardEnhanced ──bundle──▶ embeddableEnhanced
```

Every consumer does the same thing:

```typescript
services.embeddableEnhanced?.initializeEmbeddableDynamicActions(uuid, getTitle, state);
```

### Why it fits Global DI

This is the strongest architectural case for `Global` DI because it
demonstrates that `Global` tokens can **prevent the need for bridge plugins
entirely**.

If `initializeEmbeddableDynamicActions` were published as a `Global` token by
`uiActionsEnhanced` (or by the `embeddable` plugin itself via auto-bridge):

1. The `embeddableEnhanced` plugin could be eliminated or reduced to an
   internal wiring concern.
2. All 7 consumer plugins would resolve the function from the DI container
   instead of declaring an `optionalPlugins` dependency.
3. The original `embeddable` ↔ `uiActionsEnhanced` cycle would stay broken
   without needing the intermediate plugin.

### Strengths

- Directly eliminates the need for a bridge plugin — the strongest argument
  for `Global` DI as an architectural pattern.
- The contract is minimal (one function), making it easy to token-ize.
- 7 consumers would drop an optional dependency.
- Demonstrates a general pattern: any time a cycle is broken by extracting a
  thin bridge plugin, `Global` DI is likely a better solution.

### Weaknesses

- The `embeddableEnhanced` plugin was just created; proposing to eliminate it
  may cause friction with the team that authored the refactoring.
- The bridge plugin also contains `DynamicActionStorage`,
  `getDynamicActionsState`, and `hasDynamicActions` interfaces — more than just
  one function.  A full elimination would require tokenizing several related
  symbols.

---

## Option 4: uiActions Registry as DI (Registry-to-Token Pattern)

### The pattern

`uiActions` is a foundational registry required by 47 plugins.  Plugins register
**actions** and **triggers** during setup, and other plugins discover and execute
them at runtime by string ID.  `uiActionsEnhanced` extends this with
**drilldowns** — action factories that can be serialized and attached to
embeddables.

The current architecture:

- Plugins that define drilldowns (e.g. `urlDrilldown`, `dashboardEnhanced`,
  `lens`) require `uiActionsEnhanced` at setup to call `registerDrilldown()`.
- Plugins that consume drilldowns (e.g. `embeddableEnhanced`, `dashboard`)
  require `uiActionsEnhanced` at start to call `getActionFactories()` and
  render the `DrilldownManager` component.

The `registerDrilldown()` / `getActionFactories()` pattern is a manual,
string-keyed service registry — conceptually the same thing that DI does with
typed tokens.

### Why it fits Global DI

There are two levels of opportunity:

**Level 1 — Publish `DrilldownManager` globally.**  The `DrilldownManager` React
component (exported by `uiActionsEnhanced`) is consumed by `dashboardEnhanced`
and `embeddableEnhanced` to render the drilldown creation/edit flyout.
Publishing it as a `Global` token would decouple those consumers from the
`uiActionsEnhanced` plugin dependency, following the same flyout pattern as
APM/SLO.

**Level 2 — Replace `registerDrilldown()` with DI bindings.**  Instead of
plugins calling `uiActionsEnhanced.registerDrilldown(definition)` imperatively
during setup, each drilldown-providing plugin could `bind(DrilldownToken)` in its
DI module.  The platform would collect all `Global` bindings of that token type
and populate the registry automatically.  This would invert the dependency: the
registry discovers drilldowns from the container rather than drilldowns pushing
into the registry.

Level 2 is a deeper change that goes beyond the current `Global` scope PoC (it
requires multi-binding / tagged binding support), but Level 1 is immediately
achievable.

### Strengths

- Level 1 is straightforward and follows the proven flyout pattern.
- Level 2 demonstrates that `Global` DI can generalize the registry pattern
  used across Kibana (actions, triggers, drilldowns, embeddable factories).
- `uiActions` is depended upon by 47 plugins, so improvements here propagate
  widely.

### Weaknesses

- Level 1 alone has modest impact (only 2-3 consumers of `DrilldownManager`).
- Level 2 requires DI features (multi-binding, tagged resolution) that are not
  yet part of the `@kbn/core-di` surface.
- `uiActions` is deeply integrated into the platform; changes carry high risk
  if the contract shifts.

---

## Comparison

| Criterion                    | Opt 1: Cases↔APM | Opt 2: Agent Builder | Opt 3: Embeddable Drilldowns | Opt 4: uiActions Registry |
| ---------------------------- | ---------------- | -------------------- | ---------------------------- | ------------------------- |
| Structural match to APM/SLO  | Highest          | High                 | High (bridge elimination)    | Medium (registry pattern) |
| Number of consumers helped   | 2 (mutual)       | 7+                   | 7 (+ eliminates a plugin)    | 47 (Level 2) / 2 (Lvl 1) |
| Implementation complexity    | Low              | Medium               | Low–Medium                   | Low (Lvl 1) / High (Lvl 2) |
| Browser bundle risk          | Low              | High                 | Low (already optional)       | Low                       |
| Contract stability           | High             | Low                  | Medium (newly created)       | High                      |
| Demonstrates new DI pattern  | No (same as SLO) | No (same as SLO)    | Yes (bridge elimination)     | Yes (registry-to-DI)     |

## Recommendation

**Option 3 (Embeddable Drilldowns)** is the most compelling addition to the PoC.
It demonstrates a qualitatively new argument for `Global` DI: that it can
**prevent bridge plugins from being created** in the first place.  The
`embeddableEnhanced` plugin exists solely because the platform lacked a way to
publish a service globally without a plugin dependency.  `Global` DI is that
mechanism.

**Option 1 (Cases ↔ APM)** remains the safest choice for a second test case,
validating true mutual dependency with a stable contract.

**Option 4 (uiActions Registry)** is the most forward-looking, pointing toward a
future where DI replaces manual registries.  Level 1 is achievable now; Level 2
is a roadmap item.

**Option 2 (Agent Builder)** is architecturally interesting but carries the most
risk due to contract instability and browser bundle limitations.
