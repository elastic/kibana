# Official Redux sources

Use these primary sources when a claim needs a citation or when the installed dependency versions differ from the baseline in `best_practices.md`. Check documentation and release notes for the exact installed version; current documentation may describe newer behavior.

## Version and migration references

- [Redux Toolkit releases](https://github.com/reduxjs/redux-toolkit/releases): release-specific features, fixes, and compatibility notes.
- [Migrating to Redux Toolkit 2.0 and Redux 5.0](https://redux.js.org/usage/migrations/migrating-rtk-2): RTK 2 and Redux 5 breaking changes, TypeScript requirements, middleware typing, and removed APIs.
- [React-Redux releases](https://github.com/reduxjs/react-redux/releases): release-specific React-Redux behavior and compatibility.
- [Reselect releases](https://github.com/reduxjs/reselect/releases): release-specific selector and memoization behavior.
- [Reselect 5.0 summary](https://redux.js.org/reselect/introduction/v5-summary): Reselect 5 defaults, development checks, and API changes.

For an exact version, select its tag in the official repository rather than assuming that the latest documentation applies.

## Redux Toolkit APIs and usage

- [Configure Store](https://redux.js.org/toolkit/api/configureStore): default middleware, enhancers, and store typing.
- [Create Slice](https://redux.js.org/toolkit/api/createSlice): reducers, prepared reducers, selectors, and creator callbacks.
- [Create Entity Adapter](https://redux.js.org/toolkit/api/createEntityAdapter): normalized collection state and generated selectors.
- [Create Async Thunk](https://redux.js.org/toolkit/api/createAsyncThunk): async lifecycles, cancellation, rejected values, and `unwrap`.
- [Listener Middleware](https://redux.js.org/toolkit/api/createListenerMiddleware): reactive workflows and typed listeners.
- [Redux usage with TypeScript](https://redux.js.org/usage/usage-with-typescript): typed stores, actions, reducers, middleware, tuples, pre-typed hooks, and application types.

## Selectors and rendering

- [Deriving data with selectors](https://redux.js.org/usage/deriving-data-selectors): selector design, memoization, and React rendering behavior.
- [Reselect best practices](https://redux.js.org/reselect/usage/best-practices/): stable input selectors, result-function responsibilities, identity result functions, and effective memoization.

## RTK Query

- [RTK Query overview](https://redux.js.org/toolkit/rtk-query/overview): API slices, reducers, middleware, and data-fetching/cache responsibilities.
- [Cache behavior](https://redux.js.org/toolkit/rtk-query/usage/cache-behavior): cache identity, subscriptions, and per-query caching without cross-query entity deduplication.
- [Automated re-fetching](https://redux.js.org/toolkit/rtk-query/usage/automated-refetching): provided tags, invalidation, and abstract tag IDs.
- [Queries](https://redux.js.org/toolkit/rtk-query/usage/queries): loading versus fetching state and `selectFromResult`.
- [Manual cache updates](https://redux.js.org/toolkit/rtk-query/usage/manual-cache-updates): optimistic updates, undo patches, and invalidation fallback.

## Citation rules

- Prefer the official Redux, Redux Toolkit, React-Redux, and Reselect documentation above.
- Use release notes or source at an exact tag for version-specific claims.
- Distinguish documented behavior from a local recommendation.
- Include the dependency version with any claim whose truth changes across versions.
