## How well does the codebase implement the state-action machine pattern from Lamport's "Computation and State Machines"?

_Updated after reading the paper directly (PDF at `~/Downloads/Computation-and-State-Machines.pdf`; 30 pages, dated 19 April 2008 in the preface)._

**Paper access (first pass):** The Microsoft Research URL returned HTTP 503; the assessment below is grounded in the local PDF, not generic TLA⁺ vocabulary.

### 1. Brief recap of the paper's prescription

Lamport's note is a **conceptual unification** essay, not a TLA⁺ manual. Its central move is to separate **what a computation is** from **what generates computations**:

> "a computation is a sequence of steps, which I call a **behavior**" — §2.1, p. 2

For **state behaviors**, a step is a pair ⟨s, t⟩ of states; a behavior is s₁ → s₂ → s₃ → ···. For **state-action behaviors** (the form Kibana uses), a step is a triple ⟨s, α, t⟩ where α is an **action** drawn from a set **A**:

> "A state-action behavior is a sequence s₁ α₁ → s₂ α₂ → s₃ α₃ → ···" — §2.1, p. 2

A **state machine** (generator of state behaviors) is specified by a state set **S**, initial states **I ⊆ S**, and a **next-state relation** **N ⊆ S × S**. It generates behaviors satisfying:

> "S1. s₁ ∈ I  
> S2. ⟨sᵢ, sᵢ₊₁⟩ ∈ N, for all i.  
> S3. If the behavior is finite, then it ends in a state s for which there is no state t with ⟨s, t⟩ ∈ N." — §2.2, p. 3

A **state-action machine** replaces **N** with a **next-state set** **N ⊆ S × A × S**. An action α here is a **label on a step**, not an actor. **Determinism** is defined separately: for each s there is at most one ⟨α, t⟩ (or at most one t for a plain state machine). **Nondeterminism** is allowed; **fairness conditions** may constrain which enabled steps occur (§2.2, p. 3–4), but §5 says fairness is "mostly ignored" in the correctness discussion.

**§4 (Describing state machines)** introduces **state variables**, an initial predicate **Init**, and a **transition predicate** **Next** over primed and unprimed variables—this is the paper's mathematical notation for **N**, not a different formalism from the code-level loop.

**§5 (Correctness)** emphasizes **invariance** (reachable states satisfy a state predicate **P**), proved by the **inductive invariant method** (Init ⇒ Inv; Inv ∧ Next ⇒ Inv′; Inv ⇒ P). It also covers **partial correctness** (Pre/Post via Floyd–Hoare) and **refinement** (especially **data refinement** and **refinement with stuttering**, §5.2.3–5.2.4). The paper does **not** frame correctness primarily as temporal-logic **safety** (□) and **liveness** (◇); those appear only where fairness meets TLA in passing.

**Stuttering** in this paper is chiefly a **refinement** device (extra steps that leave visible state unchanged), and optionally explicit identity steps ⟨s, s⟩ ∈ N (§5.2.4, p. 22–23)—not the default definition of every behavior in §2.2.

### 2. How the Kibana algorithm maps to those primitives

The Saved Objects **migrations v2** algorithm in `@kbn/core-saved-objects-migration-server-internal` is explicitly documented as following this paper:

```27:46:src/core/packages/saved-objects/migration-server-internal/src/state_action_machine.ts
/**
 * A state-action machine for performing Saved Object Migrations.
 *
 * Based on https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf
 *
 * The state-action machine defines it's behaviour in steps. Each step is a
 * transition from a state s_i to the state s_i+1 caused by an action a_i.
 *
 * s_i   -> a_i -> s_i+1
 * s_i+1 -> a_i+1 -> s_i+2
 *
 * Given a state s1, `next(s1)` returns the next action to execute. Actions are
 * asynchronous, once the action resolves, we can use the action response to
 * determine the next state to transition to as defined by the function
 * `model(state, response)`.
 *
 * We can then loosely define a step as:
 * s_i+1 = model(s_i, await next(s_i)())
```

| Paper term | Kibana realization | Files | Notes |
|------------|-------------------|-------|-------|
| **State set S** | `State` discriminated union (`controlState` + per-stage fields) | `state.ts` | State = assignment to variables (`indexPrefix`, `retryCount`, `outdatedDocuments`, …). PR #260815 shrinks S by removing unreachable control tags. |
| **Initial states I** | `createInitialState` → `controlState: 'INIT'` + defaults | `initial_state.ts` | Usually a single initial configuration; paper also allows a set I. |
| **Next-state set N (state-action)** | Pair **(s, α, t)** realized as: `α = next(s)()`, then **t = model(s, α's response)** | `next.ts`, `model/model.ts`, `actions/` | Matches §2.2's state-action machine: action label + state change. |
| **Transition predicate Next** | Disjunctive branches in `model` per `controlState` (canonical form in §4) | `model/model.ts` | Not written as primed formulas; equivalent to a big Next disjunction. |
| **Computation / behavior** | Logged sequence of control transitions + action outcomes | `migrations_state_action_machine.ts` | Finite behaviors end in `DONE` or `FATAL` (§2.1 terminate vs deadlock). |
| **Computing object** | `migrationStateActionMachine` run | `run_v2_migration.ts` → wrapper | Object **generates** behaviors; machine **is** the spec+impl bundle. |
| **Determinism** | Scheduling: one thunk per `controlState`; **model** deterministic in (s, response) | `next.ts`, `model.ts` | ES/environment can still yield varied responses → implementation-level nondeterminism. |
| **Stuttering / identity steps** | Same `controlState` with updated `retryCount`/`retryDelay`; wait loops | `model/retry_state.ts`, `WAIT_FOR_MIGRATION_*` | Aligns with §5.2.3–5.2.4 (refinement-with-stuttering story), not required by §2.2 S1–S3. |
| **Inductive invariant Inv** | Not written; partial implicit typing | — | **Gap the paper cares about** (§5.1.1). |
| **Refinement Y refines X** | No abstraction relation R or refinement mapping | — | `zdt/` is a sibling machine, not a refinement proof of v2. |
| **Fairness** | Retry caps, delays; not specified as predicates | `retry_state.ts`, `next.ts` | Paper defers fairness in §5; Kibana has operational fairness only. |

**Main loop (behavior generator):**

```58:79:src/core/packages/saved-objects/migration-server-internal/src/state_action_machine.ts
export async function stateActionMachine<S extends ControlState>(
  initialState: S,
  next: Next<S>,
  model: Model<S>
) {
  let state = initialState;
  let nextAction = next(state);

  while (nextAction != null) {
    const actionResponse = await nextAction();
    const newState = model(state, actionResponse);

    state = newState;
    nextAction = next(state);
  }

  return state;
}
```

**Initial state:**

```110:112:src/core/packages/saved-objects/migration-server-internal/src/initial_state.ts
  return {
    controlState: 'INIT',
    waitForMigrationCompletion,
```

**Terminal states (no further actions):**

```345:347:src/core/packages/saved-objects/migration-server-internal/src/next.ts
    if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
      // Return null if we're in one of the terminating states
      return null;
```

**Branching via action outcome (not pure failure):** `checkTargetTypesMappings` returns `TaskEither` left variants that `model` treats as alternate transitions:

```47:57:src/core/packages/saved-objects/migration-server-internal/src/actions/check_target_mappings.ts
export const checkTargetTypesMappings =
  ({
    indexTypes,
    indexMappings,
    appMappings,
    latestMappingsVersions,
    hashToVersionMap = {},
  }: CheckTargetTypesMappingsParams): TaskEither.TaskEither<
    IndexMappingsIncomplete | TypesChanged | TypesAdded,
    TypesMatch
  > =>
```

```1564:1573:src/core/packages/saved-objects/migration-server-internal/src/model/model.ts
      const left = res.left;
      if (isTypeof(left, 'index_mappings_incomplete')) {
        // reindex migration
        // some top-level properties have changed, e.g. 'dynamic' or '_meta' (see checkTargetTypesMappings())
        // we must "pick-up" all documents on the index (by not providing a query)
        return {
          ...stateP,
          controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES',
          updatedTypesQuery: Option.none,
        };
```

### 3. Strengths — where Kibana faithfully realizes the pattern

**Uses the paper's intended machine sort.** The implementation is a **state-action machine** (§2.1–2.2), not a plain state machine with hidden actions. The header comment reproduces the paper's step diagram sᵢ → aᵢ → sᵢ₊₁ and the composed step law `sᵢ₊₁ = model(sᵢ, await next(sᵢ)())` — see citation block in §2 above.

**Separates behavior generation from IO.** Lamport's computing object **generates** behaviors; Kibana's `stateActionMachine` loop (§2) only advances states when an action thunk resolves. Side effects stay in `actions/*`, matching §3's point that program statements map to steps while the **state** holds variables (heap, control point, etc.).

**Pure transition logic.** `model` is a side-effect-free interpreter from (current state, action outcome) to next state — the right place for the paper's **Next** disjuncts (§4), even though they are coded as TypeScript branches rather than primed formulas.

**Exhaustive control-state coverage.** Terminal states `DONE`/`FATAL` cannot invoke `model` (`throwBadControlState`); `next` returns `null` — implementing §2.2 S3-style "no successor step" by ending the behavior.

**Tests the transition predicate in isolation.** `model.test.ts` is analogous to checking **Inv ∧ Next ⇒ Inv′** and individual **Next** disjuncts on representative states (§5.1.1, §5.1.3) without running the full von Neumann-style environment.

**Observable behaviors for debugging.** `logStateTransition` materializes the state-action trace the paper treats as the computation — useful when §2.1's distinction between **terminate** and **deadlock** matters in production.

### 4. Weaknesses / divergences

| Divergence | Evidence | Severity |
|------------|----------|----------|
| **No inductive invariants (§5.1.1)** | No documented **Inv** with Init ⇒ Inv and Inv ∧ Next ⇒ Inv′ | **High** per *this paper*; weaker than "missing □ safety" (TLA+ projection). |
| **No refinement proof (§5.2)** | Single concrete machine; no abstraction relation **R** or refinement mapping | **Medium** — paper treats refinement as core to "correctness"; product may not need it. |
| **Next not written as primed formulas (§4)** | `{ ...stateP, field }` spreads hide v vs v′ | **Medium** — review cost; not a conceptual break. |
| **Response alphabet undocumented** | `Either.left` used for branches (`index_mappings_incomplete`, …) and errors | **Medium** — blurs enabling conditions vs outcomes in **Next**. |
| **`next.ts` vs `model.ts` split** | Action label α chosen separately from transition | **Low** — still a valid state-action machine; harder to read as one **Next** disjunction. |
| **Fairness / termination not specified** | Retries operational; §5 mostly ignores fairness anyway | **Low–medium** — *previous "no liveness spec" critique is partially withdrawn*: the paper does not ask for ◇ formulas here. |
| **Hidden / external state** | Delays, ES cluster, clocks not in **S** | **Medium** — behaviors not fully determined by recorded variables (cf. §2.4 hidden state). |
| **Example-only testing of Next** | No relative completeness-style invariant proofs | **Medium** — §5.1.2–5.1.3 methods unused. |
| **Stale names vs `controlState` set** | Test titles (earlier section) drift from **S** | **Low** — documentation debt, not machine unsoundness. |

**Correction from the generic first pass:** Docking the codebase for lacking **temporal-logic liveness (◇)** overstated what *this* paper demands. Lamport explicitly narrows §5 to invariance and refinement and "mostly ignore[s] fairness." The fairer gap is **missing inductive invariants** and **no refinement story**, not missing □/◇ specs.

**§3 granularity choice is unresolved.** The paper stresses that *what counts as one step* is a design choice (factorial programs example, p. 8–10). Kibana fixes granularity at "one ES-facing action per control state," but does not document that choice the way §3 recommends for concurrent programs.

### 5. Score / verdict

| Aspect | Score (1–5) | Comment |
|--------|:-----------:|---------|
| State explicitness (§4 variables) | 4 | Rich `State` union; spreads obscure primed deltas. |
| State-action structure (§2.2) | 5 | Direct match: `next` + `model` + loop. |
| Next / transition predicate purity | 5 | `model` pure given (s, response). |
| Inductive invariants (§5.1) | 1 | Paper's main correctness tool; not used explicitly. |
| Refinement (§5.2) | 1 | No R / refinement-with-stuttering proof. |
| Fairness / termination (§2.2, §5) | 2 | Operational retries only; paper also light here. |
| Testability of Next | 4 | Strong example tests; no Inv-based proofs. |
| Observability of behaviors (§2.1) | 4 | Logs give state-action traces. |
| **Overall pattern fidelity** | **4 / 5** | Strong **operational** state-action machine; weak on **§5 correctness** apparatus. |

**Verdict:** Against *this* paper—not generic TLA⁺—Kibana's migrations v2 is a **faithful operational state-action machine**: it generates **state-action behaviors**, keeps **Next** in a pure `model`, and documents the same step law Lamport writes in §2.2. It does **not** adopt the paper's **correctness layer** (inductive invariants, Floyd–Hoare-style annotations, refinement mappings). That is a fair engineering trade; it means the codebase implements the **machine architecture** Lamport advocates in §2–4, but not the **mathematical verification discipline** he develops in §5.

I previously over-weighted missing **◇ liveness** and under-weighted missing **§5.1 invariants**; reading the PDF reverses that emphasis. PR #260815 improves **S** by pruning unreachable control states without changing the loop structure.

### 6. Practical recommendations

Three **independent tracks**. Earlier drafts of this document conflated them; reviewing them separately exposes that the highest-correctness wins are not tied to the file restructure and can land in V2 today without moving any code.

**Track A — Static-typing improvements.** Highest static-correctness payoff per unit work; no file restructure required.

1. **Per-step state types.** Each control state's `State` interface declares only its own fields, extending a shared `BaseState` for `retryAttempts` / `retryCount` / `logs`. Eliminates "field present in wrong phase" bugs at compile time.

2. **Per-action discriminated unions for responses.** Replace catch-all `Either<…, …>` shapes with typed unions per action (`CheckSourceResponse = SourceFoundResponse | SourceMissingResponse`). Branch outcomes become first-class, not stuffed into `Either.left` next to errors. (Recommendation #5 from earlier drafts; kept and elevated.)

3. **Literal-typed `SUCCESSORS` table.** Encode the transition graph as a single `Record<State.Name, readonly State.Name[]>` with `as const satisfies`. Combined with `SuccessorsOf<T>` and `State.Of<T>`, every step's `transition` is statically constrained to return states whose name is in its declared successor set. **Replaces** the earlier draft's AST-walker proposal — the graph is data, not source to be scraped.

4. **`SuccessorsOf<T>` constraint on the step return type.** `Step<TNext extends State.Name, TResponse>` with `transition: (response: TResponse) => State.Of<TNext>` makes the type system enforce "transitions land on a declared successor."

**Track B — Correctness apparatus (Lamport §5.1).** Highest absolute correctness payoff; independent of file structure.

5. **`invariants.ts` + `assertInvariants(state)` after each step** — Implement §5.1.1's inductive invariant method (Init ⇒ Inv; Inv ∧ step ⇒ Inv′). Example clauses: `retryCount ≤ retryAttempts`; `outdatedDocuments` only in bulk/transform states; `state.name === CREATE_TARGET ⇒ sourceIndex is set`. Called in dev/tests, no-op in prod. **Small; the single highest-value change in this document.**

6. **Property-based tests of invariant preservation** — `fast-check` over `(state, response)` pairs; assert `Inv(s) ⇒ Inv(transition(s, response))` and that `transition`'s returned `state.name` is in `SUCCESSORS[state.name]`. Instantiates §5.1 without a prover. **Medium.**

7. **Snapshot-tested `SUCCESSORS` table** — `expect(SUCCESSORS).toMatchSnapshot()`. Any edge addition/removal is one diff line in PR review. **Small.**

8. **Document Init and per-step transitions** — One short table per step (enabling condition, action α, response variants, successor names). Most of this is now expressible as code (the `Step<Successors, R>` signature), but a doc/README still serves §2's goal of uniform description. **Small.**

**Track C — File restructure and ergonomics.** Should follow Tracks A and B, not lead.

9. **One file per step (`steps/<name>.ts`).** Each step file exports `Name`, `State`, `step`. The dispatch becomes a switch on `state.name` returning `INIT.step(state, io)`. ZDT is already half-way here; converging V2 and ZDT on this shape is a smaller delta than rewriting V2's `model.ts` from scratch.

10. **Co-located per-step tests** (`steps/init.test.ts` beside `steps/init.ts`). Renames stay atomic; no stale-string drift.

11. **`transitionTo<TName>(carry, name, extras)` helper** — `Omit<State.Of<TName>, keyof BaseState | 'name'>` on `extras` forces every call site to provide exactly the new variables the target shape requires. Scales cleanly to 40+ states.

12. **Document stuttering steps explicitly** — Map `delayRetryState` / wait loops to §5.2.3–5.2.4 (identity/refinement stutter). Retry stays a self-loop step (see "Explicitly rejected" below).

**Explicitly rejected (corrections to earlier drafts):**

- **`withRetry` / `withLog` decorators on `Step`.** Hiding retries inside the action thunk makes them invisible to the trace. Retry must remain a **self-loop transition** — a step whose `transition` returns `transitionTo(state, Name, { retryCount: retryCount + 1, ... })`. Lamport §2.1: each retry is one step in the behavior. Logging belongs in the loop driver, where it sees every step uniformly.

- **AST-walker / Mermaid-from-source.** Replaced by the typed `SUCCESSORS` table. The graph is the data; no walker needed. An optional Mermaid script can read `SUCCESSORS` (a typed JS value) at build time, but reads from data not source.

- **Putting `client` / IO dependencies on `State`.** State must stay serializable for logs, traces, and fixtures. Pass an `io` parameter to each step's `step(state, io)` factory instead. ZDT's `context` parameter is the existing precedent.

- **Default-exporting `Name` from step files.** Use `import * as INIT` + `INIT.Name`. Self-enforcing (the namespace name ties to the file path), no `eslint-disable import/no-default-export` boilerplate.

- **Trace test phrased as temporal ◇(DONE ∨ FATAL).** Not motivated by §5's development. Retry/termination kept as operational fairness, not TLA liveness.

- **`controlState` field name.** Lamport §3 puts the program counter inside the state as a variable; we call that variable `state.name`. Idiomatic TS discriminant naming (`kind`/`type`/`tag`/`name`); single doc comment carries the Lamport mapping. See vocabulary section below.

- **`StepPlan` vs `Step` as two distinct types.** Lamport's executed step ⟨s, α, t⟩ never appears as a value in our code — only the next state does. The thing each step file returns (`{ action, transition }`) is named `Step` because that's what TS readers naturally call it. The Lamport-pure executed triple stays a doc-level concept.

---

## A reshape of the migration state-action machine

_Per-file `Step` records dispatched by `state.name`, with a typed successor graph._

### Three independent tracks

The reshape is conventionally bundled but **separable in practice**:

- **A. Type structure** — per-step state, typed responses, literal-typed `SUCCESSORS`, `SuccessorsOf<T>` constraint. Highest static-correctness payoff per unit work. No file move required.
- **B. Correctness apparatus** — `invariants.ts`, `assertInvariants`, property-based tests, snapshot of `SUCCESSORS`. Highest absolute correctness payoff. Independent of file structure.
- **C. File restructure** — one file per step, co-located tests. Ergonomics and stale-test resistance. Should follow A and B.

This section describes what the code looks like after all three tracks land. The vocabulary and shape are chosen so that A and C compose cleanly: the typing decisions in A determine which files exist and what they export in C.

### Vocabulary

The rule: **each term names what it is at the call site, not what it represents in a formal model.** The Lamport mapping is carried in doc comments next to the types, not in the identifier choices.

| Term | What it is | Lamport mapping |
|------|------------|-----------------|
| `Name` | The PC label for one step, exported from each step file as `'X' as const`. | §3: the control point — a variable inside the state |
| `State` | The discriminated union of all step state variants. | §2.2 set S |
| `State.Name` | `State['name']` — the union of all `Name` literals. | The set of control-point values |
| `State.Of<TName>` | `Extract<State, { name: TName }>` — the state shape for one Name. | Subset of S restricted to a PC value |
| `State.NonTerminal` | `Exclude<State, DONE.State \| FATAL.State>`. | States with outgoing transitions |
| `State.Terminal` | `DONE.State \| FATAL.State`. | §2.2 S3 — no successor |
| `SUCCESSORS` | Literal-typed `Record<State.Name, readonly State.Name[]>` declaring the graph. | The label projection of N |
| `SuccessorsOf<TName>` | `(typeof SUCCESSORS)[TName][number]` — per-step allowed targets. | Per-state next-set |
| `Step<TNext, TResponse>` | `{ action, transition }` — the per-phase recipe each step file returns. | See note below — implicit Lamport step |
| `step()` (per-step factory) | `(state, io) => Step<Successors, R>`. Returns the recipe. | — |
| `IO` | Bundle of IO capabilities (ES client, transformers, wait groups) threaded into each step. | The environment — not on State |
| `Behavior` (optional) | `readonly State[]` — the trace of a run, if we ever type it. | §2.1 |

**Lamport's executed step ⟨s, α, t⟩ is intentionally not a TS type.** It never appears as a value in the code we write — only the next state does. Reasoning about the executed triple happens in proofs and trace analysis, where it can be reconstructed from consecutive states. Making it a type would create a noun that exists only to claim formal fidelity, with no developer-facing role. The recipe `{ action, transition }` is what every step file produces; `Step` names that.

**Why `state.name` and not `state.controlState`.** Lamport §3 puts the program counter inside the state as a variable, alongside other variables like `sourceIndex` and `retryCount`. We use `state.name` because:

1. TS-conventional discriminant naming (`kind` / `type` / `tag` / `name`) reads cleaner at call sites: `case INIT.Name:`, `state.name === INIT.Name`.
2. "Control state" is jargon from PL theory; the type system shouldn't teach the theory.
3. The symmetry `INIT.Name` (one literal, per-step) ↔ `State.Name` (the union, at union scope) reads as parallel grammar at both scopes.

**Why `Step` and not `StepPlan` or `ExecutedStep`.** A previous draft introduced `StepPlan` to distinguish the recipe from Lamport's executed triple. In practice, the executed triple never appears as a value — only the next state does. Forcing the distinction into the type system is vocabulary tax with no payoff. `Step` names the recipe; the executed triple is implicit. A doc comment carries the formal mapping.

**Why `IO` and not `Actions` or `V3MigrationActions`.** "Action" is overloaded with Lamport's "action label" — the α that labels each step. A step's `action` field calls an `io.fetchIndices(...)` method, not `actions.fetchIndices(...)`. No homonym.

**Why `import * as INIT` and not `default-export NAME`.** The namespace name `INIT` ties to the file path (typo'ing it breaks `INIT.Name`, `INIT.State`, `INIT.step` simultaneously). Default exports require `/* eslint-disable import/no-default-export */` in every step file and allow drift between import alias and label value. The `SUCCESSORS` table works fine with `[INIT.Name]: [CHECK_SOURCE.Name]`.

### Where V2 is today

V2 splits **Next** across two files. `next.ts` maps each `controlState` to an IO thunk via a `nextActionMap`. `model.ts` is one ~1800-line switch that takes a state and an action response and returns the next state. Each control state's full behavior lives in three places — `state.ts` (its type), `next.ts` (which IO it triggers), `model.ts` (how it interprets the response). Terminals are implicit: `next.ts` returns `null` for `DONE`/`FATAL` and the wrapper at `migrations_state_action_machine.ts` reads `state.controlState` after the loop.

Transition targets are bare string literals (`controlState: 'CREATE_NEW_TARGET'`). cmd+click goes nowhere. The transition graph isn't statically derivable. Test titles encoding obsolete state names drift quietly (this review's earlier audit found 17 stale labels).

### The shape

```ts
// state.ts
import * as INIT from './steps/init';
import * as CHECK_SOURCE from './steps/check_source';
// ...

export interface BaseState {
  readonly retryAttempts: number;
  readonly retryCount: number;
  readonly logs: readonly string[];
}

export type State =
  | INIT.State
  | CHECK_SOURCE.State
  | CREATE_TARGET.State
  | MARK_READY.State
  | DONE.State
  | FATAL.State;

export namespace State {
  /** Lamport §3: the PC value. One of the variables of the state tuple. */
  export type Name = State['name'];
  export type NonTerminal = Exclude<State, DONE.State | FATAL.State>;
  export type Terminal = DONE.State | FATAL.State;
  export type Of<TName extends Name> = Extract<State, { name: TName }>;
}

export const isTerminal = (state: State): state is State.Terminal =>
  state.name === DONE.Name || state.name === FATAL.Name;
```

```ts
// types.ts
import * as INIT from './steps/init';
import * as CHECK_SOURCE from './steps/check_source';
// ...

export const SUCCESSORS = {
  [INIT.Name]:          [CHECK_SOURCE.Name],
  [CHECK_SOURCE.Name]:  [CREATE_TARGET.Name, FATAL.Name],
  [CREATE_TARGET.Name]: [CREATE_TARGET.Name, MARK_READY.Name, FATAL.Name],
  [MARK_READY.Name]:    [DONE.Name, FATAL.Name],
  [DONE.Name]:          [],
  [FATAL.Name]:         [],
} as const satisfies Record<State.Name, readonly State.Name[]>;

export type SuccessorsOf<TName extends State.Name> = (typeof SUCCESSORS)[TName][number];

/**
 * A Step is the per-phase recipe: the IO action to perform and the pure
 * transition from its response to the next state.
 *
 * Lamport's executed step ⟨s, α, t⟩ is implicit. `s` is the state passed to
 * the step's factory, `α` is `action`, and `t` is what `transition` returns
 * once the response is in. The triple appears in traces as consecutive states;
 * it has no first-class type here.
 */
export interface Step<TNext extends State.Name, TResponse> {
  readonly action: () => Promise<TResponse>;
  readonly transition: (response: TResponse) => State.Of<TNext>;
}
```

```ts
// steps/init.ts
import * as CHECK_SOURCE from './check_source';
import { appendLog, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import type { InitResponse, IO } from '../io';

export const Name = 'INIT' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, InitResponse> => ({
  action: () => io.init(),
  transition: () =>
    transitionTo(
      resetRetry(appendLog(state, 'INIT completed')),
      CHECK_SOURCE.Name,
      {},
    ),
});
```

```ts
// next.ts
import * as INIT from './steps/init';
import * as CHECK_SOURCE from './steps/check_source';
// ...
import { assertNever } from './assert_never';
import type { State } from './state';
import type { IO } from './io';

export const next = async (state: State.NonTerminal, io: IO): Promise<State> => {
  switch (state.name) {
    case INIT.Name: {
      const s = INIT.step(state, io);
      return s.transition(await s.action());
    }
    case CHECK_SOURCE.Name: {
      const s = CHECK_SOURCE.step(state, io);
      return s.transition(await s.action());
    }
    // ...
    default:
      return assertNever(state);
  }
};
```

```ts
// run_migration.ts
export const runMigration = async ({ io, retryAttempts = 3 }: RunMigrationParams) => {
  let state: State = createInitialState(retryAttempts);
  while (!isTerminal(state)) {
    state = await next(state, io);
  }
  return state;
};
```

Per-step files for `DONE`/`FATAL` only need `Name` and `State` — no `step` factory. `State.NonTerminal` makes "terminals have no step factory" a compile-time fact: `next` cannot be called on a terminal because its parameter type rules it out.

### Helpers

**`transitionTo` — cross-shape transitions with statically-checked extras.**

```ts
export const transitionTo = <TName extends State.Name>(
  carry: BaseState,
  name: TName,
  extras: Omit<State.Of<TName>, keyof BaseState | 'name'>,
): State.Of<TName> =>
  ({ ...carry, ...extras, name } as State.Of<TName>);
```

The `Omit<State.Of<TName>, keyof BaseState | 'name'>` constraint forces every call site to provide exactly the new variables the target shape requires. TS rejects missing fields (e.g., transitioning to `CREATE_TARGET` without `sourceIndex`) and rejects extra fields. This is load-bearing for a 40-state machine; without it, manual field-by-field copying drifts.

Usage:

```ts
transition: (response) =>
  response.type === 'source_missing'
    ? transitionTo(
        appendLog(state, `CHECK_SOURCE failed: ${response.reason}`),
        FATAL.Name,
        { reason: response.reason },
      )
    : transitionTo(
        resetRetry(appendLog(state, `CHECK_SOURCE found ${response.sourceIndex}`)),
        CREATE_TARGET.Name,
        { sourceIndex: response.sourceIndex },
      ),
```

**`match` — collapse the if-ladder for tagged unions.**

```ts
export const match = <U extends { type: string }, R>(
  union: U,
  cases: { [K in U['type']]: (member: Extract<U, { type: K }>) => R },
): R => cases[union.type as U['type']](union as never);
```

Used inside `transition`:

```ts
transition: (response) => match(response, {
  target_created:    (r) => transitionTo(resetRetry(state), MARK_READY.Name, { targetIndex: r.targetIndex }),
  fatal_failure:     (r) => transitionTo(state, FATAL.Name, { reason: r.reason }),
  retryable_failure: (r) => state.retryCount >= state.retryAttempts
    ? transitionTo(state, FATAL.Name, { reason: r.message })
    : transitionTo(state, Name, { sourceIndex: state.sourceIndex, retryCount: state.retryCount + 1 }),
}),
```

**Not introduced: `withRetry` / `withLog` decorators.** Retry remains a self-loop transition (the step's own `transition` returns `transitionTo(state, Name, { retryCount: retryCount + 1, ... })`). Each retry is one step in the behavior — Lamport §2.1 — and tests can assert exact retry counts at step granularity. Logging belongs in the loop driver, where it sees every step uniformly.

**Not introduced: `client` / IO on `State`.** Each step's factory takes `(state, io)`. State stays serializable; tests construct states without an ES client; `console.log(state)` produces something useful.

### Graph derivation

The graph is the `SUCCESSORS` constant itself. No AST walker is required.

- **Type-level enforcement.** `Step<SuccessorsOf<typeof Name>, R>` constrains each step's `transition` return to states whose `name` is in its declared successor set. Removing `MARK_READY.Name` from `SUCCESSORS[CREATE_TARGET.Name]` becomes a type error at every `transitionTo(carry, MARK_READY.Name, …)` inside `create_target.ts`. Adding an unintended entry is caught only if no transition produces it; pair with the runtime check below.
- **Runtime cross-check (test).** Fuzz `(state, response)` over each step's `step(state, io).transition(response)` and assert the returned `state.name` is in `SUCCESSORS[currentName]`. Detects type-level claims that don't hold at runtime (e.g., a successor declared but unreachable).
- **Snapshot test.** `expect(SUCCESSORS).toMatchSnapshot()`. Any intentional graph change is one diff line in PR review.
- **Optional Mermaid script.** Reads `SUCCESSORS` (a typed JS value) at build time and emits Mermaid for docs. The script reads data, not source AST — it can't desync from the actual graph because it imports the same constant the type system uses.

### Worked examples

**Retry as a self-loop (visible in trace):**

```ts
// steps/create_target.ts
import * as MARK_READY from './mark_ready';
import * as FATAL from './fatal';
import { appendLog, resetRetry, transitionTo, type BaseState } from '../state';
import type { Step, SuccessorsOf } from '../types';
import type { CreateTargetResponse, IO } from '../io';

export const Name = 'CREATE_TARGET' as const;

export interface State extends BaseState {
  readonly name: typeof Name;
  readonly sourceIndex: string;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, CreateTargetResponse> => ({
  action: () => io.createTarget(state.sourceIndex),
  transition: (response) => {
    if (response.type === 'target_created') {
      return transitionTo(
        resetRetry(appendLog(state, `CREATE_TARGET created ${response.targetIndex}`)),
        MARK_READY.Name,
        { targetIndex: response.targetIndex },
      );
    }
    if (response.type === 'fatal_failure') {
      return transitionTo(
        appendLog(state, `CREATE_TARGET failed: ${response.reason}`),
        FATAL.Name,
        { reason: response.reason },
      );
    }
    if (state.retryCount >= state.retryAttempts) {
      return transitionTo(
        appendLog(state, `CREATE_TARGET exhausted retries: ${response.message}`),
        FATAL.Name,
        { reason: response.message },
      );
    }
    return transitionTo(
      appendLog(state, `CREATE_TARGET retrying: ${response.message}`),
      Name,
      { sourceIndex: state.sourceIndex, retryCount: state.retryCount + 1 } as never,
    );
  },
});
```

Each retry is one logged step. Tests assert exact `retryCount` after N failures. The retry edge `CREATE_TARGET → CREATE_TARGET` appears in `SUCCESSORS` and in the type system.

### Co-located test

```ts
// steps/init.test.ts
import * as INIT from './init';
import * as CHECK_SOURCE from './check_source';
import type { IO } from '../io';

test('INIT → CHECK_SOURCE on success', () => {
  const state: INIT.State = { name: INIT.Name, retryAttempts: 3, retryCount: 0, logs: [] };
  const io = { init: async () => ({ type: 'started' as const }) /* ... */ } as IO;
  const s = INIT.step(state, io);

  expect(s.action).toEqual(expect.any(Function));
  const next = s.transition({ type: 'started' });
  expect(next.name).toBe(CHECK_SOURCE.Name);
});
```

Renaming the step renames the file, the `Name` constant, the imports in successor step files, and the test together. Stale labels cannot drift.

### Correctness apparatus (Track B)

```ts
// invariants.ts
import type { State } from './state';

export const invariants = {
  retryCountInRange: (s: State) => s.retryCount >= 0 && s.retryCount <= s.retryAttempts,
  sourceIndexSetWhenNeeded: (s: State) =>
    !['CREATE_TARGET', 'MARK_READY'].includes(s.name) || 'sourceIndex' in s,
  // ...
};

export const assertInvariants = (s: State) => {
  for (const [name, inv] of Object.entries(invariants)) {
    if (!inv(s)) throw new Error(`Invariant ${name} violated at ${s.name}: ${JSON.stringify(s)}`);
  }
};
```

Called from the loop driver in dev / tests:

```ts
while (!isTerminal(state)) {
  state = await next(state, io);
  if (process.env.NODE_ENV !== 'production') assertInvariants(state);
}
```

Property-based check that the type-level graph claim holds at runtime:

```ts
// successors.test.ts
import fc from 'fast-check';
import { SUCCESSORS } from './types';
import * as INIT from './steps/init';
// ...

test.each([INIT /* , CHECK_SOURCE, CREATE_TARGET, ... */])('$Name only transitions to declared successors', (M) => {
  fc.assert(fc.asyncProperty(arbitraryStateFor(M.Name), arbitraryResponseFor(M.Name), async (state, response) => {
    const s = M.step(state, fakeIO);
    const next = s.transition(response);
    expect(SUCCESSORS[M.Name]).toContain(next.name);
  }));
});

test('SUCCESSORS table snapshot', () => {
  expect(SUCCESSORS).toMatchSnapshot();
});
```

### Verdict

The reshape is small, disciplined, and decoupled. Four nouns — `Name`, `State`, `Step`, `IO` — each named for its call-site role, with the Lamport mapping carried in doc comments rather than identifiers. The graph is data, the transitions are type-constrained, retries stay visible in the trace, IO stays off `State`, and the correctness apparatus is independent of where the files live.

Cost: per-step file overhead (~40 files for V2). Gain: every property a reviewer cares about — what does this step do, where does it go, what does it call, what does it preserve — is answerable from the one file the step lives in, with the static-correctness backbone enforcing the graph and the runtime apparatus enforcing the invariants.

## How does the proposal compare to ZDT's existing file organization?

**Location:** ZDT (Zero Downtime) migrations live under `src/core/packages/saved-objects/migration-server-internal/src/zdt/` — not `zdt_v2/`. Entry: `run_zdt_migration.ts` → `migrate_index.ts`; there is no separate top-level `zdt` package outside `migration-server-internal`.

### 1. How ZDT actually organizes its model

**State definition.** ZDT uses the same `controlState` discriminant as V2 (not a separate `stage` field). All variants are declared in one file, ```203:226:src/core/packages/saved-objects/migration-server-internal/src/zdt/state/types.ts``` — a discriminated union of ~21 action-bearing states plus `DONE` and `FATAL`. Narrowing helpers are explicit: ```235:259:src/core/packages/saved-objects/migration-server-internal/src/zdt/state/types.ts``` defines a manually maintained `ControlStateMap` and `StateFromActionState<T>` (stronger ergonomics than V2's raw union alone).

**Action selection.** Central `zdt/next.ts`, mirroring V2: ```57:191:src/core/packages/saved-objects/migration-server-internal/src/zdt/next.ts``` defines `nextActionMap(context)` with one entry per `AllActionStates`; ```194:213:src/core/packages/saved-objects/migration-server-internal/src/zdt/next.ts``` wraps it in `next(state)` (delay + `null` for terminals). Action selection is **not** in the per-stage files.

**Next-state function.** Split architecture, but **only half** is per-file. ```55:77:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/model.ts``` is a thin dispatcher: retry handling, then `modelStageMap[current.controlState](current, response, context)`. The map ```30:53:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/model.ts``` registers 21 handlers imported from `model/stages/`. Each stage file exports a `ModelStage<…>` function — e.g. ```26:33:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/init.ts``` types outbound control states in the generic; ```15:34:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/outdated_documents_search_open_pit.ts``` handles only the response half. Files are named `snake_case` matching the control state (`init.ts`, `outdated_documents_search_open_pit.ts`), barrel-exported from ```10:30:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/index.ts```.

**Actions.** Mostly shared with V2: ```12:33:src/core/packages/saved-objects/migration-server-internal/src/zdt/actions/index.ts``` re-exports `fetchIndices`, `openPit`, etc. from `../../actions`; ZDT adds `update_index_meta` and `wait_for_delay` locally.

**Loop driver.** Same generic runner as V2: ```58:60:src/core/packages/saved-objects/migration-server-internal/src/zdt/migration_state_action_machine.ts``` calls ```58:77:src/core/packages/saved-objects/migration-server-internal/src/state_action_machine.ts``` with ZDT's `next` and `model`. Termination is still `next` returning `null`; ```98:113:src/core/packages/saved-objects/migration-server-internal/src/zdt/migration_state_action_machine.ts``` interprets `DONE` / `FATAL` after the loop (parallel to V2's `migrations_state_action_machine.ts`).

**Tests.** ZDT colocates unit tests with stages (`init.test.ts`, `outdated_documents_search_open_pit.test.ts`, etc.) — closer to the proposal's test story than V2's monolithic `model.test.ts`.

**Contrary to assuming ZDT renamed "stages" differently:** ZDT still calls them `controlState` values; the folder is just named `model/stages/`.

### 2. Comparison table

| Concern | V2 today | ZDT today | Proposal |
|---|---|---|---|
| State definition | Single `state.ts` union, all fields on every variant | Single `zdt/state/types.ts` union + `ControlStateMap` helper | Per-file `State extends BaseState` with only that step's fields; union assembled in `state.ts` |
| Discriminant field | `state.controlState` | `state.controlState` | `state.name` (idiomatic TS; doc comment carries the Lamport-PC mapping) |
| Action selection | Central `next.ts` map | Central `zdt/next.ts` map | Colocated in each step file's `step(state, io)` factory |
| Next-state function | Central `model/model.ts` `if` ladder (~1.8k lines) | Per-file `ModelStage` + central `modelStageMap` dispatch | Per-file `step()` returning `{ action, transition }`; central `next.ts` switch on `state.name` |
| IO dependencies | Closed over by `nextActionMap(client, …)` | Passed via `context` parameter | Passed via `io` parameter (matches ZDT pattern) |
| Action layer | `actions/*.ts` | Re-export V2 `actions/` + 2 ZDT actions | Shared action implementations; `IO` interface bundles them per migration version |
| Step contract | Implicit (`next` + `model`) | Implicit (`next` + `model`) | Explicit `Step<TNext, TResponse> = { action, transition }` |
| Transition targets | String literals in branches | String literals in stage functions | Namespace-imported identifiers (`MARK_READY.Name`) + literal-typed `SUCCESSORS` graph |
| Graph encoding | Implicit (in `model.ts`); hand-maintained `README.md` | Implicit (in `modelStageMap` + stage generics) | Literal-typed `SUCCESSORS: Record<State.Name, readonly State.Name[]>`; `SuccessorsOf<T>` constrains transition return types |
| Loop driver | Generic `state_action_machine.ts` | Same generic + ZDT wrapper | Inline `while (!isTerminal(state))` per migration version; terminal detection via `state.name` |
| Retry mechanism | Self-loop transition (`delayRetryState`) | Self-loop transition | Self-loop transition (kept; `withRetry` decorators explicitly rejected) |
| Response shape | Broad `Either<ErrorUnion, OkUnion>` per action | Same broad `Either` | Per-action discriminated union (`type: 'target_created' \| 'fatal_failure' \| 'retryable_failure'`) |
| Stale-test resistance | Low (17 stale titles this PR) | Higher (per-stage tests) | Highest (per-step files + namespace imports + `Name` constant) |
| Correctness apparatus | None documented | None documented | `invariants.ts` + `assertInvariants` + PBT + snapshot of `SUCCESSORS` (Track B) |

### 3. What ZDT already does right (that the proposal echoes)

- **Per-control-state response modules** — ZDT split the model ladder into `model/stages/*.ts` before the proposal existed; dispatch via ```30:53:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/model.ts``` matches the proposal's central `next.ts` switch, except ZDT uses a typed `Record` map.
- **IO passed by parameter, not on State** — ZDT threads a `context` through `next` and `model`. The proposal's `io` parameter is the same shape under a different name.
- **Typed stage contracts** — `ModelStage<'INIT', 'CREATE_TARGET_INDEX' | …>` at ```26:33:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/init.ts``` documents allowed successors in the type system. The proposal's `SuccessorsOf<typeof Name>` does the same but sources the successor list from a single `SUCCESSORS` table rather than per-stage generic parameters — refactor-safer.
- **Co-located stage tests** — e.g. `init.test.ts` beside `init.ts`; aligns with the proposal's per-file tests (V2 still centralizes most coverage in `model.test.ts`).
- **Shared action library** — ZDT does not duplicate ES IO; the proposal likewise keeps `actions/` central, bundled into the per-version `IO` interface.

### 4. What ZDT still shares with V2 (that the proposal would change)

- **`next` / `model` split** — ZDT still maintains parallel dispatch: ```57:191:src/core/packages/saved-objects/migration-server-internal/src/zdt/next.ts``` vs ```30:53:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/model.ts```. Opening `outdated_documents_search_open_pit.ts` shows only the handler; the matching `Actions.openPit` line lives in `next.ts`. The proposal merges these into one `{ action, transition }` per state, in one file.
- **String-literal transitions** — e.g. ```42:42:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/init.ts``` `controlState: 'FATAL'`, ```27:27:src/core/packages/saved-objects/migration-server-internal/src/zdt/model/stages/outdated_documents_search_open_pit.ts``` `controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ'`. No cmd+click to target files; the proposal's `import * as INIT` + `INIT.Name` pattern fixes this.
- **No `Step` envelope** — The recipe is still implicit across two functions and two maps. The proposal's `Step<TNext, TResponse>` makes it one record per phase.
- **No structural `SUCCESSORS` graph** — ZDT's `ModelStage` generics document adjacency per stage but are not aggregated into one table. The proposal centralizes the graph in `SUCCESSORS` so a single `SuccessorsOf<T>` mapped type constrains every transition.
- **Broad `Either` for responses** — ZDT inherits V2's `Either<ErrorUnion, OkUnion>` shape. The proposal switches to per-action discriminated unions where branch outcomes (`source_missing`, `retryable_failure`) are first-class alongside fatal errors.
- **`state.controlState` field name** — ZDT uses V2's vocabulary. The proposal renames to `state.name`.
- **Central state types** — Unlike the proposal's per-file `State`, ZDT keeps all interfaces in ```zdt/state/types.ts```.
- **No correctness apparatus** — Neither V2 nor ZDT has `assertInvariants`, PBT over invariants, or a snapshotted graph. The proposal's Track B is independent of file structure and would land on both.

### 5. Migration-mode hypothesis

`git log --follow` on `zdt/model/stages/init.ts` shows a **greenfield ZDT track** (bootstrap #151282, "first stages" #152219, "second part" #153031, March–2024 era) rather than a refactor that peeled apart V2's `model.ts`. There is no `zdt/README` describing the layout. **Hypothesis:** ZDT authors intentionally avoided V2's monolithic model and introduced `stages/` as a **fresh-structure choice** for a new algorithm (rolling / zero-downtime operational regime), not as a formal spec for `{ run, handle }` or import-based navigation. The per-file split solved **reviewability and test locality**; it did not unify action + handler or automate graph derivation. That is directionally aligned with the proposal but stops halfway.

### 6. Net recommendation

**Apply the three tracks to both V2 and ZDT**, but do not bundle them as one big change.

- **Track A (types) lands first**, on V2 and ZDT in parallel. Per-step `State`, per-action discriminated response unions, literal-typed `SUCCESSORS` table, `SuccessorsOf<T>` constraint on transition return types. No file moves required for V2; ZDT already has per-stage files that just need their state interfaces narrowed and their response unions split. This is the highest-static-correctness-per-unit-work change in the entire proposal.
- **Track B (correctness apparatus) is independent** and could land first if Track A is delayed. `invariants.ts` + `assertInvariants` after each step, `fast-check` PBT for invariant preservation and graph claims, snapshot-tested `SUCCESSORS`. Equally valuable on V2 and ZDT regardless of file structure.
- **Track C (file restructure) follows**, converging V2 and ZDT on `{ action, transition }` per step. ZDT is closer to the target — its per-stage files already exist and IO is already passed by parameter (its `context` ≈ the proposal's `io`). For ZDT, Track C is mostly: move `next.ts` action selection into each step's `step()` factory, rename `ModelStage` → `step`, rename `controlState` → `name`, drop default exports, switch to `import * as`. For V2, Track C is a larger move because there are no per-state files today.

The unifying force is Track A's type structure. Once V2 and ZDT both have per-step `State`, discriminated response unions, and a `SUCCESSORS` table, an engineer switching between algorithms reads the same vocabulary at every call site (different ops regimes, identical state-machine mechanics). Track C is then a mechanical re-layout, not a redesign.
