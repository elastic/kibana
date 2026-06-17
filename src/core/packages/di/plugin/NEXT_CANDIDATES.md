# Services and Extension Points: Next Candidate Dependencies

Evaluation of plugin dependency patterns that could benefit from the
services-and-extension-points PoC demonstrated on this branch.

> **What's already on this branch**
>
> - **Services:** the SLO flyouts and the Alpha/Beta example both use explicit
>   service tokens.
> - **Extension points:** `lens`, `dashboard_markdown`, and
>   `image_embeddable` contribute to the `embeddable.FactoryRegistration`
>   extension point, and `embeddable` hosts and resolves that collection.

## Option 1: Cases ↔ APM (Mutual Services)

### The pattern

- `apm` optionally depends on `cases` to display case-related UI.
- `cases` optionally uses APM context at runtime.

### Why it fits

This is a clean **service** case. Each side owns one or more optional contracts,
and the relationship is genuinely mutual. It is structurally similar to the
Alpha/Beta example, but with production plugins and higher user impact.

### Strengths

- Strong proof that mutual optional services do not require circular plugin
  dependencies.
- Close to the SLO/APM pattern already demonstrated.
- Stable, easy-to-explain architecture.

### Weaknesses

- Larger testing surface than the current examples.
- Architectural novelty is lower because it extends the service pattern rather
  than demonstrating a new one.

---

## Option 2: Agent Builder (Many Consumers, Single Service Owner)

### The pattern

- `agentBuilder` exposes a reusable UI capability that several plugins want to
  embed.
- Some of those consumers also sit in the wider dependency graph of things that
  `agentBuilder` itself needs.

### Why it fits

This is also a **service** case: one owner, many consumers, single-value
resolution. It is a strong candidate for demonstrating broad service reuse
across solution boundaries.

### Strengths

- High relevance to active Kibana product work.
- Many consumers would benefit from one shared service contract.
- Good example of optional UI composition via services.

### Weaknesses

- Contract surface is still evolving.
- Browser bundle loading constraints still apply.

---

## Option 3: Embeddable Drilldowns (Service-Based Bridge Elimination)

### Background

`embeddableEnhanced` exists largely to expose drilldown-related wiring that
several plugins call through a thin optional dependency.

### The pattern

Multiple plugins optionally depend on a bridge plugin mainly to call a small
set of functions such as `initializeEmbeddableDynamicActions(...)`.

### Why it fits

This is the strongest next **service** candidate because it shows how explicit
services can eliminate the need for a bridge plugin entirely.

If the drilldown wiring contract were provided as a service token by the real
owner, then consumers could resolve that service directly without depending on
`embeddableEnhanced`.

### Strengths

- Strong architectural story: services replace a bridge plugin.
- Minimal contract surface.
- Many consumers benefit immediately.

### Weaknesses

- The surrounding refactor is recent, so revisiting it may create friction.
- The bridge owns more than one symbol, so a full migration may involve several
  related services.

---

## Option 4: uiActions Registry (Extension Point Generalization)

### The pattern

`uiActions` and `uiActionsEnhanced` use a manual registration model:

- provider plugins call registration APIs during setup
- host plugins discover definitions later through registry lookups

### Why it fits

This is the clearest next **extension point** candidate.

There are two layers:

1. **Service layer:** publish the `DrilldownManager` component or other
   host-owned utilities as services for direct consumers.
2. **Extension-point layer:** replace `registerDrilldown()`-style imperative
   registration with host-owned extension points and plugin contributions.

### Strengths

- Best demonstration that extension points can replace manual registries.
- Generalizes beyond embeddables into a broader platform pattern.
- High leverage because `uiActions` is widely used.

### Weaknesses

- Higher implementation risk than the service-oriented options.
- The deeper registry replacement work goes beyond the current branch scope.

---

## Comparison

| Criterion | Opt 1: Cases↔APM | Opt 2: Agent Builder | Opt 3: Embeddable Drilldowns | Opt 4: uiActions Registry |
| --- | --- | --- | --- | --- |
| Primary pattern | Service | Service | Service | Extension point |
| Structural novelty | Medium | Medium | High | Highest |
| Consumers helped | 2+ | 7+ | 7+ | Broad platform |
| Implementation complexity | Low | Medium | Low-Medium | Medium-High |
| Browser bundle risk | Low | High | Low | Low-Medium |
| Architectural payoff | High | High | Highest | Highest long-term |

## Recommendation

**Option 3 (Embeddable Drilldowns)** remains the best next candidate.

It demonstrates a new argument for the service model: optional services can
remove the need for thin bridge plugins entirely.

**Option 4 (uiActions Registry)** is the strongest extension-point follow-up.

It would show that extension points are not just a nicer spelling for
multi-binding, but a concrete replacement for manual registry APIs.

**Option 1 (Cases ↔ APM)** is the safest next service example, and
**Option 2 (Agent Builder)** is the highest-impact broad-consumer service case.
