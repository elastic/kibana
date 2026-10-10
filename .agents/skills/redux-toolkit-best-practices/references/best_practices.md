# Redux Toolkit 2.12 best practices

This reference records the October 2026 baseline for Kibana. Always confirm current root dependency versions before use.

## Store setup and TypeScript

- Use `configureStore`, not legacy `createStore`.
- Extend defaults with `getDefaultMiddleware().prepend(...).concat(...)` and `getDefaultEnhancers().concat(...)`.
- Keep `middleware` before `enhancers` in the options object for correct inference.
- Use RTK's `Tuple` only when deliberately replacing default middleware or enhancers. Avoid array spread because it widens middleware types.
- Infer `RootState` as `ReturnType<typeof store.getState>` and `AppDispatch` as `typeof store.dispatch`.
- Export pre-typed `useAppDispatch`, `useAppSelector`, and, where needed, `useAppStore` hooks.
- Treat middleware actions as `unknown`; narrow with `isAction` or an action creator's `.match()` predicate.
- Keep actions and state serializable. Store serializable representations instead of functions, promises, class instances, DOM nodes, `Map`, `Set`, or `Date` objects.

## State design

- Put only shared, global, cached, persisted, or cross-component state in Redux.
- Keep transient forms and isolated UI state local unless a concrete requirement justifies Redux.
- Organize files and slices by feature or domain, not component or technical category.
- Name state keys for stored data, never `thingReducer`.
- Keep canonical state minimal. Derive filtered lists, totals, booleans, and presentation shapes.
- Normalize nested or relational collections. Use `createEntityAdapter` where `{ ids, entities }` is suitable.
- Model lifecycle state explicitly, such as `idle | pending | succeeded | failed`, and reject invalid transitions when necessary.
- Let reducers own and validate state shape. Avoid blind replacements or broad payload merges unless the payload deliberately represents the complete validated state.

## Reducers and actions

- Prefer `createSlice` and generated action creators.
- Put state-transition calculations in reducers rather than event handlers.
- Immer draft mutation is valid inside RTK-managed reducers only. Never mutate selected state or action payloads elsewhere.
- In one case reducer, either mutate the draft or return replacement state; never do both.
- Prefer event names such as `orderSubmitted` to setters such as `setOrderStatus`.
- Represent one conceptual transaction with one event action. Multiple slices may handle the same event.
- Avoid sequential dispatches that expose invalid intermediate state.
- Use `prepare` callbacks for IDs, metadata, or payload normalization.
- Use builder callbacks for `extraReducers` and `createReducer`; object lookup syntax was removed in RTK 2.
- Use discriminated state and exhaustive checks where impossible states matter.

## Selectors and rendering

- Use plain selectors for direct lookups.
- Use `createSelector` when derivation is expensive or returns a new array/object reference.
- Input selectors should only extract stable values. Put `map`, `filter`, sorting, and object construction in the result function.
- Never use `state => state` as a Reselect input.
- Never use a memoized result function that merely returns one input unchanged.
- Ensure all input selectors accept compatible additional argument types.
- Reselect 5 defaults to `weakMapMemoize`, so a shared parameterized selector usually does not need a selector factory.
- Do not create selectors for every field or memoize trivial direct lookups.
- Do not return fresh objects or arrays from an un-memoized `useSelector` callback.
- Prefer focused subscriptions and multiple small `useSelector` calls over one fresh aggregate object.
- For large lists, select IDs in the parent and let item components select their own entity when that improves measured rendering behavior.
- Use `selectFromResult` for narrow RTK Query subscriptions and keep its returned references stable.

## Async logic and side effects

- Inspect the target plugin or package and follow its established, coherent data-fetching pattern.
- RTK Query is a good default for new Redux-owned server fetching, caching, and request deduplication, not a mandate to migrate existing code.
- TanStack React Query / `useQuery` is a valid established Kibana pattern. Do not replace it with RTK Query without a concrete correctness, maintainability, ownership, or performance benefit.
- Avoid maintaining RTK Query and TanStack Query caches for the same server resource within one feature; choose one cache owner.
- Use thunks for imperative workflows and moderately complex async logic requiring `dispatch` or `getState`.
- Use listener middleware for reactive workflows responding to actions or state changes.
- Keep reducers pure and side-effect free.
- Use `dispatch(thunk()).unwrap()` when callers need normal promise success/error behavior.
- Type expected API failures with `rejectWithValue`.
- Handle cancellation or request identity when stale responses could overwrite newer state.
- Use Saga or Observable only for a demonstrated requirement not served by thunks or listeners.
- Do not turn custom middleware into an unstructured business-logic layer.

## RTK Query

Apply this section where the target area already uses RTK Query or where RTK Query has been deliberately selected for new behavior. It does not invalidate an established TanStack React Query or other coherent local pattern.

- Prefer one `createApi` instance per base URL or closely related backend. Split definitions with `injectEndpoints` when needed.
- Register both `api.reducer` and `api.middleware`.
- Do not copy RTK Query response data into ordinary slices without a demonstrated second-state requirement.
- Treat endpoint name plus serialized query argument as cache identity. Keep arguments semantically consistent.
- Use entity tags for targeted invalidation and a collision-safe abstract ID such as `LIST` for collection membership.
- Avoid broad type invalidation unless every active related query should refetch.
- Prefer declarative `providesTags` and `invalidatesTags` over manual `refetch()` calls.
- Distinguish `isLoading` for the initial load from `isFetching` for any in-flight request.
- Await or unwrap mutations when subsequent logic depends on completion.
- Keep optimistic updates narrow and retain undo patches; invalidate after failure when rollback becomes ambiguous.
- RTK 2 defaults `invalidationBehavior` to `delayed`; do not assume RTK 1.9 immediate invalidation.
- RTK Query is a document cache, not a globally normalized entity cache. Separate endpoint/argument combinations retain separate cache entries.

## RTK 2.12 compatibility

- `createSlice.extraReducers` and `createReducer` require builder callbacks.
- `configureStore.middleware` and `configureStore.enhancers` require callback forms.
- Action types must be strings.
- `AnyAction` is deprecated in favor of `UnknownAction`.
- `createSlice.selectors`, `combineSlices`, reducer injection, dynamic middleware, and creator-callback reducers are available.
- `create.asyncThunk` requires a custom `buildCreateSlice` configured with `asyncThunkCreator`.
- Declaring `createAsyncThunk` outside a slice remains simpler when strongly typed `RootState` or `AppDispatch` access is needed.
- Reselect 5 uses `weakMapMemoize` by default and warns in development about unstable inputs and identity result functions.
- `configureStore` includes `autoBatchEnhancer` by default.
- RTK 2.12's documented minimum TypeScript version is 5.4.
- Do not rely on RTK 2.13+ behavior while Kibana is pinned to 2.12.0.
- New code should import `@reduxjs/toolkit`, not Kibana's `redux-toolkit-v1` compatibility alias.

## Anti-pattern review table

| Anti-pattern | Failure mode | Correction |
|---|---|---|
| Mutating selected state in components | Redux state corruption | Dispatch an action |
| Non-serializable state or actions | DevTools, replay, persistence, and checks break | Store serializable representations |
| Derived values stored in state | Synchronization bugs | Derive with a selector |
| Server response duplicated across Redux and a query library | Competing sources of truth | Keep one cache owner: existing TanStack Query or RTK Query |
| Inline `filter` or `map` in `useSelector` | Rerenders after unrelated actions | Use a memoized selector |
| Input selector creates arrays or objects | Memoization always misses | Extract stable inputs |
| Reducer mutates and returns | Ambiguous or invalid Immer update | Choose one update style |
| Many setter actions for one event | Invalid intermediate states | Dispatch one event action |
| Replacing default middleware accidentally | Loses thunk and development checks | Extend `getDefaultMiddleware()` |
| Spreading default middleware | Degraded dispatch inference | Use `.prepend()` and `.concat()` |
| `AnyAction` or `any` middleware | Defeats RTK 2 type safety | Use `UnknownAction` and predicates |
| Broad RTK Query invalidation | Request storm | Use entity and `LIST` tags |
| One RTK Query API slice per endpoint | Excess middleware and isolated caches | Share an API slice |
| Replacing working TanStack Query code solely with RTK Query | Churn without user or engineering benefit | Preserve the established local pattern |
| RTK Query and TanStack Query caching the same resource | Divergent data and invalidation | Choose one cache owner |
| Memoizing every selector | Complexity without benefit | Memoize transformations only |
| Whole-slice subscriptions everywhere | Excess rerenders | Use granular selectors |
| Redux-backed keystroke form state | Dispatch and render overhead | Keep edits local until submit |
| Independent async booleans | Impossible lifecycle combinations | Use one discriminated status |
| New imports from `redux-toolkit-v1` | Locks code to legacy APIs | Import `@reduxjs/toolkit` |

## Review checklist

- [ ] Current package versions were checked before applying guidance.
- [ ] Existing state-management and data-fetching patterns in the target area were inspected and preserved unless a concrete problem justifies change.
- [ ] State ownership is justified; local state was considered.
- [ ] State and actions are serializable.
- [ ] Canonical state is minimal and relational data is normalized where useful.
- [ ] Reducers own transitions and do not combine draft mutation with replacement returns.
- [ ] Actions describe meaningful events and avoid sequential pseudo-transactions.
- [ ] Store customization preserves default middleware, enhancers, and TypeScript inference.
- [ ] Unknown actions are narrowed safely.
- [ ] Selectors avoid unstable inputs, unnecessary memoization, and fresh un-memoized outputs.
- [ ] Component subscriptions are appropriately granular.
- [ ] The async mechanism matches the responsibility.
- [ ] Server data has one clear cache owner; RTK Query rules are applied only where RTK Query is actually used.
- [ ] Loading, fetching, errors, cancellation, and stale responses are handled correctly.
- [ ] No API newer than the pinned RTK version is used.
- [ ] Behavior changes have focused tests.
