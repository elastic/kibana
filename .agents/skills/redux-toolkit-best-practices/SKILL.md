---
name: redux-toolkit-best-practices
description: "Apply and review Redux Toolkit best practices in Kibana, including stores, slices, selectors, middleware, async logic, and RTK Query. Version-aware and focused on common anti-patterns and performance pitfalls. Invoke explicitly with /skill:redux-toolkit-best-practices."
disable-model-invocation: true
---

# Redux Toolkit best practices

Apply version-compatible Redux Toolkit guidance when implementing, debugging, or reviewing Redux code in Kibana.

## Start every invocation with version detection

Read the root `package.json` and identify these exact dependency versions:

- `@reduxjs/toolkit`
- `redux`
- `react-redux`
- `reselect`
- any aliased legacy Redux Toolkit package

Treat the installed `@reduxjs/toolkit` version as the feature ceiling. Do not recommend or implement APIs introduced by a newer release. If code imports an aliased legacy package, apply that package's version-specific rules instead of silently modernizing it.

The research baseline in `references/best_practices.md` targets Kibana's October 2026 dependency set:

- Redux Toolkit 2.12.0
- Redux 5.0.1
- React-Redux 9.2.0
- Reselect 5.1.0
- legacy alias `redux-toolkit-v1` at Redux Toolkit 1.9.7

If the current versions differ, verify changed behavior against official documentation before applying the baseline.

## Select a mode

State the selected mode before proceeding:

- **Implement**: create or modify Redux Toolkit code.
- **Review**: inspect code or a diff and report concrete findings by severity.
- **Debug**: trace correctness, cache, typing, or rendering behavior.
- **Design**: recommend state ownership and the appropriate RTK mechanism without editing files.

For implementation and review, read `references/best_practices.md`. For claims requiring external citations or version verification, also read `references/sources.md` and prefer official Redux sources.

## Core decisions

Kibana is a large codebase with multiple established state-management patterns. Inspect the target plugin or package before recommending an approach, and preserve its coherent local pattern unless there is a concrete correctness, maintainability, or performance problem.

Choose the mechanism by responsibility when designing new Redux-owned behavior:

| Requirement | Default mechanism |
|---|---|
| Server fetching already managed by TanStack React Query / `useQuery` | Continue that local pattern |
| New server fetching owned by an established RTK Query API boundary | RTK Query |
| Imperative sync/async workflow requiring `dispatch` or `getState` | thunk / `createAsyncThunk` |
| Reaction to actions or state changes | listener middleware |
| State transition | slice reducer |
| Component-only lifecycle or local state | React hooks |

RTK Query is a good default, not a migration mandate. TanStack React Query and other established data-fetching patterns are valid. Do not recommend replacing them merely for consistency with RTK; require a specific defect or meaningful simplification. Avoid introducing a second caching system for the same server data within one feature.

Before adding Redux state, establish why the value must be shared, global, cached, persisted, or observed across components. Keep transient forms and isolated UI state local by default.

## Implementation rules

- Use `configureStore` and preserve default middleware and enhancers unless replacement is explicitly justified.
- Infer `RootState` and `AppDispatch` from the configured store and expose typed React-Redux hooks.
- Use `createSlice`; colocate domain reducers, actions, and reusable selectors.
- Keep state and actions serializable.
- Keep canonical state minimal and derive additional values with selectors.
- Normalize relational collections; use `createEntityAdapter` when its model fits.
- Put state-transition logic in reducers and use Immer draft mutation only inside RTK-managed reducers.
- Never both mutate a draft and return replacement state in one case reducer.
- Prefer meaningful event actions over field setters and sequential action transactions.
- Use builder callbacks for `extraReducers` and `createReducer`.
- Narrow unknown actions with action creator `.match()` predicates.
- Memoize selectors only for expensive calculations or new-reference outputs.
- Keep Reselect input selectors simple and reference-stable; transform in the result function.
- Where RTK Query is already used, design tags deliberately and avoid duplicating query data into ordinary slices.
- Preserve an established TanStack React Query / `useQuery` pattern unless there is a concrete reason to change it.
- Avoid parallel RTK Query and TanStack Query caches for the same server resource within one feature.
- Add or update focused tests when behavior changes.

## Review output

Report only actionable findings. For each finding include:

- severity: `blocker`, `high`, `medium`, or `low`
- file and line
- violated rule or concrete failure mode
- smallest safe correction

Do not report a stylistic preference unless it has a correctness, maintainability, typing, cache, or rendering consequence. If no findings exist, state that explicitly and list any unverified risks or test gaps.

Use the checklist in `references/best_practices.md` for review and self-review.
