# RFC: [Feature/Change Name] with [Architecture/Approach Name]

## Summary

<!--
1-3 sentences. State what this RFC proposes at the highest level: what changes, what
the new architecture/approach is, and why the current state is insufficient. Name the
key concepts (bolded) that the rest of the document will define. This paragraph should
let a reader who only reads the Summary decide whether the RFC is relevant to them.
-->

## TLDR

<!--
Three bullet points that let a busy reader grasp the entire proposal in 10 seconds.
Use Before/After/Result to frame the transformation:
-->

- **Before**: [Current state — what exists, what problems it causes, in one sentence.]
- **After**: [Proposed state — the new architecture and how it works, in one sentence.]
- **Result**: [Concrete outcomes — performance, scalability, maintainability wins, in one sentence.]

## Motivation

<!--
One introductory sentence framing the current implementation, then a bullet list of
the specific problems it causes. Each bullet has a bolded label and a concrete
explanation of the problem (not just "it's bad" — explain the mechanism and impact).
-->

The current implementation [brief description of status quo]. This creates several problems:

- **[Problem label]**: [Explanation of the problem, its mechanism, and its user-visible or operational impact.]
- **[Problem label]**: [...]
- **[Problem label]**: [...]
- **[Problem label]**: [...]

## Why Not [Alternative A] or [Alternative B]?

<!--
Enumerate the most obvious alternative approaches that readers will ask about. For
each, explain the approach in one sentence, then give concrete technical reasons why
it was rejected. Use sub-bullets with bolded labels for each reason. End with a
"The chosen approach" subsection that summarizes why the proposed design wins.
-->

[Number] alternative approaches were considered and rejected:

### Why not [Alternative A]?

[One sentence defining what this alternative is.]

- [Concrete technical reason it doesn't work — explain the mechanism, not just the conclusion. Reference specific system behaviors, APIs, or constraints that make this infeasible.]
- [Another reason if applicable.]

### Why not [Alternative B]?

[One sentence defining what this alternative is.]

- **[Reason label]**: [Detailed explanation with specific technical grounding.]
- **[Reason label]**: [...]
- **[Reason label]**: [...]

### The chosen approach

<!--
2-3 sentences summarizing what each part of the chosen design gives you that the
alternatives couldn't. Frame it as "X gives us Y for Z purpose, and W gives us V
for U purpose."
-->

## Design

<!--
Open with 1-2 sentences naming the architectural pattern(s) this follows (e.g., CQRS,
tiered storage, event sourcing) and mapping your components to the pattern's roles.
This anchors the reader in a known mental model before the details.

The Design section is the core of the RFC. It is structured as multiple subsections,
each covering one architectural component or cross-cutting concern. The order should
follow the data flow or lifecycle of the system.
-->

### [Primary Component / Data Model]

<!--
ASCII diagram showing the high-level architecture: components, data flow arrows,
and key properties of each component. Keep it to one diagram that fits in a terminal.
-->

```
┌─────────────────────────────────────────────────────────────┐
│                   [Component A]                             │
│              ([Storage / mechanism])                        │
│                                                             │
│  - [Key property 1]                                        │
│  - [Key property 2]                                        │
│  - Used by: [consumers]                                    │
│  - [Implementation detail]                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
            [Connection / process between them]
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   [Component B]                             │
│              ([Storage / mechanism])                        │
│                                                             │
│  - [Key property 1]                                        │
│  - [Key property 2]                                        │
│  - Used by: [consumers]                                    │
│  - [Implementation detail]                                 │
└─────────────────────────────────────────────────────────────┘
```

### [Core Design Decision / Unified Model]

<!--
Explain the main design decision in depth. Start with WHAT it is (1-2 sentences),
then WHY it reflects the domain reality (show that the abstraction matches the
problem, not just that it's convenient). Then explain the key optimization or
capability this design enables, with concrete examples of how different callers
use it.
-->

[Description of the component/model and how it works.]

[Why this reflects the domain — explain the conceptual foundation, not just the
implementation. Show that the design mirrors the problem structure.]

[Key optimization or capability this enables, with concrete usage scenarios:]

- **[Scenario 1]**: [Detailed explanation of how this scenario works under the design, with specific operations, call patterns, and performance characteristics.]
- **[Scenario 2]**: [...]

#### Why [This Design Choice Over The Obvious Alternative]?

<!--
Anticipate the reader's "but why not just...?" question. State the alternative
explicitly, then give a numbered list of reasons the chosen approach is better.
Each reason has a bolded label and 1-3 sentences of explanation. End with a note
acknowledging any capabilities of the alternative that are NOT lost.
-->

The alternative is [describe the simpler/more obvious approach]. [Acknowledge it would
work], but [the chosen approach] is a better fit for several reasons:

1. **[Reason label]**: [Explanation.]
2. **[Reason label]**: [Explanation.]
3. **[Reason label]**: [Explanation.]

[Optional closing note acknowledging what the alternative does well, and why the
chosen approach doesn't sacrifice those capabilities.]

#### [Implementation Detail — e.g., ID Scheme, Data Format]

<!--
For key implementation details that the design depends on, explain the mechanism
in full. Use a concrete example with sample input/output. Reference the source file
if one exists.
-->

[Explain the mechanism and why it's needed.]

- **[Variant 1]**: [How it works, what generates it, who knows it.]
- **[Variant 2]**: [How it works. Include a concrete example:]

  ```
  input:  "[sample input]"
  output: "[sample output]"
  ```

  See `[source_file]` for the implementation.

- **[Variant 3 / manifest]**: [How it ties the pieces together.]

### [Secondary Component — e.g., History Layer, Read Model]

<!--
Describe the second major component. List concrete instances/resources, how they're
registered/managed, what properties they have, and what operations they support.
-->

### [Cross-Component Query Patterns]

<!--
Show how the components interact for each query type. Use labeled pseudocode blocks
for each pattern. Name the pattern (waterfall, fan-out, parallel multi-index, etc.)
in the heading. After the pseudocode blocks, explain the overlap/consistency model:
what happens when data exists in multiple places simultaneously.
-->

[Intro sentence explaining why cross-component queries are needed.]

**[Query pattern 1 name]** ([pattern type]):

```
functionName(params):
    // [Explain the fast path]
    result = componentA.operation(params)
    if result exists:
        return result

    // [Explain the fallback path]
    return componentB.operation(params)
```

**[Query pattern 2 name]** ([pattern type]):

```
functionName(params):
    // [Step 1]
    parent = componentA.operation(params)
    if parent exists:
        // [Step 2 — fan-out using parent's data]
        return componentA.operation(parent.childIds)

    // [Fallback]
    return componentB.search(params)
```

**[Query pattern 3 name]** ([pattern type]):

```
functionName(query, filters, pagination):
    return store.search(
        targets: [componentA, componentB],
        query: query AND filters,
        dedup: { field: 'id' },
        pagination
    )
```

[Explain the overlap/consistency model: how deduplication works, when overlap
occurs, and why it's transient/acceptable.]

#### [Query Performance Analysis]

<!--
For each query pattern, analyze latency characteristics. Explain the common case
vs. the minority case. For search queries, explain how the architecture affects
performance compared to the current approach.
-->

### [Automated Process — e.g., Migration, Sync, Cleanup]

<!--
Describe the automated process that connects the components. Cover:
- Trigger/frequency
- What it does (each step)
- Thresholds and how they relate to each other
- Why the thresholds are safe (explain the invariant)
-->

### Failure Recovery

<!--
Bullet list with bolded operation names. For each, explain WHY it's safe
(the specific mechanism — idempotency, threshold gaps, independence).
-->

- **[Operation 1] is idempotent**: [Mechanism — e.g., conflict handling, skip-if-exists.]
- **[Operation 2] is independent and conservative**: [Mechanism — e.g., threshold gap guarantees safety even if Operation 1 fails.]
- **No transactional coupling**: [Explain that partial failures leave the system in a consistent state and how queries handle the interim state.]

### Multi-Node Safety

<!--
1-2 sentences explaining how concurrent execution is prevented across a
distributed deployment.
-->

### [Isolation / Tenancy Model]

<!--
Explain how tenant isolation is maintained across all components and the
automated process. Cover both read-path and write-path isolation.
-->

### Configuration

<!--
List the configuration knob(s). For each, explain what it controls, what it derives,
and what the default is. If you deliberately chose a single-knob design over
multiple knobs, explain why (misconfiguration prevention).
-->

## Key Changes

### New Components

<!--
Bullet list with bolded component names and a brief description of each.
-->

- **[Component name]**: [What it is and what it replaces or enables.]
- **[Component name]**: [...]

### Removed Components

<!--
Bullet list of what's being removed and what replaces it.
-->

- [What's removed] (replaced by [what]).
- [...]

## [Domain-Specific Section — e.g., Lifecycle Management, Security Model]

<!--
If the design has domain-specific aspects that deserve their own top-level section
(not a subsection of Design), add them here. Include TODOs for future work that
is related but out of scope.
-->

## Upgrade Path for Existing Deployments

<!--
If this change affects existing data or systems, describe the migration path.
Cover:
1. What exists today (legacy state)
2. Why the migration can't just use the new system's normal path
3. The migration mechanism (with field mapping tables if schemas change)
4. The step-by-step upgrade process
5. Rollback and safety guarantees
-->

[Describe the legacy state and why direct migration to the new architecture
is needed.]

### One-Time Upgrade Migration

[Describe the migration mechanism.]

<!--
If schemas differ between old and new, include a field mapping table per entity:
-->

| Legacy field | New field | Transformation |
|---|---|---|
| `fieldA` | `fieldA` | As-is |
| `fieldB` | `fieldB` | As-is |
| _(missing)_ | `newField` | Set to `[value or derivation]` |

### Upgrade Process

<!--
Numbered list of concrete steps the system performs during upgrade.
-->

1. [Check for legacy state.]
2. [Migrate data.]
3. [Verify migration.]
4. [Handle legacy state (rename/archive, not delete).]
5. [Idempotency — explain why re-running is a no-op.]

### Rollback and Safety

<!--
Bullet list with bolded safety properties. Explain the rollback window, how to
restore if needed, and why the process is idempotent.
-->

- **Deferred deletion**: [Legacy data is preserved for N release cycles.]
- **Rollback path**: [How to restore the old state if needed.]
- **Idempotent startup**: [Why re-running the migration check is a no-op.]

## Observability

<!--
Describe what operational visibility the system should provide. If this is
future work, mark it as TODO. Cover logging, health surfacing, and alerting.
Include forward-looking notes about how this could evolve.
-->

## Benefits and Trade-offs

### Benefits

<!--
Bullet list with bolded benefit labels. Each bullet should name the benefit and
explain the mechanism (not just "it's faster" — explain WHY it's faster and what
that enables).
-->

- **[Benefit label]**: [Explanation of the benefit and its mechanism.]
- **[Benefit label]**: [...]

### Trade-offs

<!--
Bullet list with bolded trade-off labels. Be honest about what the design costs.
For each, explain the impact and (if applicable) why it's acceptable or how it
could be mitigated in the future.
-->

- **[Trade-off label]**: [Explanation of the cost, its impact, and why it's acceptable.]
- **[Trade-off label]**: [...]

## Risks and Open Questions

<!--
Bullet list of unresolved concerns, tuning questions, edge cases, and future
considerations. Each bullet has a bolded label. Be specific about what could go
wrong and what mitigations exist (or don't yet). Include scope boundaries —
explicitly state what is out of scope for this RFC but may be relevant later.
-->

- **[Risk/question label]**: [Description, impact, and any known mitigations.]
- **[Risk/question label]**: [...]
