# Common Review Findings (Context Engine / Kibana)

Self-review checklist based on analysis of 100 merged PRs in `elastic/kibana`. Each item below was flagged by reviewers on past PRs. Use this as a pre-submit checklist to catch recurring issues before they reach review.

---

## 1. Bundle Size & Dependencies

**Pattern**: Heavy dependencies pulled into frontend bundles unnecessarily.

- [ ] **Lazy-load heavy components** - Large components (editors, visualizations) should use `React.lazy()` or dynamic `import()`. *(#254629)*
- [ ] **Check bundle impact of new dependencies** - Run bundle analysis before adding new packages. A single import can jump bundle from 25kb to 88kb. *(#244957)*
- [ ] **Vet new dependency quality** - Check npm score, maintenance status, and license before adding. Low-quality deps get flagged by security reviewers. *(#237117)*
- [ ] **No server-only code in client bundles** - Verify imports don't pull server-side modules into `public/` code.

## 2. Architecture & Separation of Concerns

**Pattern**: Logic placed in the wrong architectural layer or abstraction level.

- [ ] **Keep logic in the right layer** - System prompt construction belongs in the system prompt service, not in a message converter. Resolve logic belongs in the attachment manager, not scattered elsewhere. *(#248937, #248788)*
- [ ] **No module-level singletons on server** - Server-side code must not use module-level singleton patterns. Use Kibana's plugin lifecycle to manage instances. Reviewers will strongly object. *(#244957)*
- [ ] **Instantiate managers at the right level** - State managers (e.g., AttachmentStateManager) should be created at the appropriate scope, not too deep in the call chain. *(#246488)*
- [ ] **Avoid overly generic abstractions** - Don't create a generic framework when a specific solution is needed. YAGNI applies. *(#248211)*
- [ ] **Don't overshoot feature scope** - Config overrides or new capabilities should go on the correct API surface, not bolted onto an unrelated one. *(#244307)*
- [ ] **Component complexity** - If a component has too many props, consider splitting it. Large prop interfaces signal the component is doing too much. *(#208354)*
- [ ] **Register functions/tools at the right scope** - Plugin-specific functions belong in the plugin endpoint, not in core services. *(#165952)*
- [ ] **Don't add unnecessary data model changes for edge cases** - Adding a new status/state to a persisted data model just for a UI nit is scope creep. Consider the downstream implications (model representation to LLM, filtering, etc.). *(#242383)*
- [ ] **Use distinct event types for distinct features** - Browser tool calls and server tool calls are different features; they should have separate event types and data structures, not reuse the same ones. *(#241658)*
- [ ] **No circular plugin dependencies** - Verify that new imports don't create circular dependency chains between plugins. *(#171081)*

## 3. Type Safety

**Pattern**: Loose typing, unnecessary casts, or missing type guards.

- [ ] **No `any` on props or function parameters** - Use explicit types. `any` on attachment props or callback args defeats TypeScript's purpose. *(#250155)*
- [ ] **Remove unnecessary generic type parameters** - If a generic doesn't add type safety, remove it. *(#248937)*
- [ ] **Use discriminated unions, not loose strings** - When `type` is a string that can be "anything", use a union type. *(#196049)*
- [ ] **Avoid unnecessary type assertions (`as`)** - If TypeScript can't infer the type, fix the types upstream rather than casting. *(#244957, #234262, #201540, #193060, #241260, #236405, #174246)*
- [ ] **Add type guards for runtime checks** - When narrowing types at runtime, use proper type guard functions. Use `.filter((x): x is Type => ...)` instead of non-null assertions. *(#196049, #201540)*
- [ ] **Remove unnecessary null guards** - Don't check for null/undefined on values that the type system guarantees are present. *(#233601, #180440, #193060)*
- [ ] **Use `import type` for type-only imports** - Don't use value imports when only the type is needed. *(#171081)*
- [ ] **Use generic type parameters on API calls** - Pass type params to `http.post<T>()` and `client.transport.request<T>()` instead of casting the response. *(#193060, #174246)*

## 4. Logic Bugs & Correctness

**Pattern**: Subtle bugs from missing awaits, wrong operators, copy-paste errors, or inverted logic.

- [ ] **Always `await` async calls** - Missing `await` creates floating promises that silently fail. Check every async function call. *(#249835)*
- [ ] **Check for double-wrapping** - Schema outputs or response objects wrapped twice (e.g., `{ data: { data: ... } }`). *(#244957)*
- [ ] **Watch for race conditions with caching** - Caching partial or in-flight results can return incomplete data. *(#180440)*
- [ ] **Verify range boundary operators** - `gt`/`lte` vs `gte`/`lt` - off-by-one on range boundaries is a frequent bug. *(#233601)*
- [ ] **Audit copy-paste code** - When duplicating logic, verify all property names and values were updated. Copy-paste errors in field names are hard to spot. *(#233601, #165952)*
- [ ] **Check default values** - Wrong defaults (e.g., wrong column type, incorrect filter label) cause subtle UI bugs. *(#233601)*
- [ ] **Verify boolean/logic inversions** - `emptyAsNull` check inverted, condition negation wrong, etc. Read the condition out loud. *(#196049)*
- [ ] **Ensure UI props are actually wired up** - Showing a cancel button without passing the abort controller prop means it does nothing. *(#176277)*
- [ ] **Don't comment out code that's still needed** - Commented-out code for non-ESQL chart creation broke that feature entirely. *(#208354)*
- [ ] **Check recursion/retry limits** - If `MAX_RETRY_ATTEMPTS` is 5 but `recursionLimit` defaults to 10, you'll hit the limit before the 5th retry (each retry takes 2+ graph steps). *(#237117)*
- [ ] **Verify LLM message sequences** - Some providers reject consecutive `HumanMessage` nodes. Must be human->ai->human alternating. Use `SystemMessage` or merge messages. *(#237117)*
- [ ] **Check precedence of overrides** - Existing conversation's `agentId` must take precedence over context-provided `agentId`. Define precedence rules clearly. *(#240967)*
- [ ] **React provider ordering** - Don't call hooks that depend on a context provider inside the provider's own component. The context isn't available yet. *(#240967)*
- [ ] **Clean up stale local storage** - If a stored conversationId no longer exists in the backend, remove it from local storage. *(#240967)*
- [ ] **Format/property at wrong object level** - Format stored at root level of column object but UI reads from `meta.params`. Verify property paths match between reader and writer. *(#201540)*
- [ ] **Data type treated as wrong collection type** - `indexPatterns` is a `Record<string, IndexPattern>`, not an array. Don't treat it as one. *(#201540)*
- [ ] **Guard mode-specific logic** - ES|QL-specific code should not run in DSL mode and vice versa. Add mode guards. *(#171081)*
- [ ] **Include `roundUp: true` for date range end** - Without rounding up, "Today" produces a zero-width time window. *(#196049)*
- [ ] **Check `FetchStatus` for both COMPLETE and PARTIAL** - Many checks only look for `COMPLETE` but miss `PARTIAL`, causing incorrect state behavior. *(#171081, #175808)*
- [ ] **Validate fallback behavior** - If no indices match a pattern, return empty results, not all indices. Wrong fallback confuses LLMs. *(#165952)*
- [ ] **Test runtime behavior, not just compilation** - Many logic bugs (brushing broken, filters wrong, chart not updating) were only found through manual testing by reviewers. *(#196049, #171081)*

## 5. API Design & Contracts

**Pattern**: Breaking changes, inconsistent naming, or error-prone optional parameters.

- [ ] **Add optional fields instead of changing types** - Changing a field from `string` to `string | object` breaks existing consumers. Add a new optional field instead. *(#243474)*
- [ ] **Use consistent naming across APIs** - Don't mix `total_tokens` and `estimated_tokens`, or `breakdown` and `group_by` for the same concept.
- [ ] **Avoid error-prone optional parameters** - An optional param that silently changes behavior when omitted is a bug waiting to happen. Make it required or provide a safe default. *(#248937)*
- [ ] **Don't create redundant methods** - `toArray()` vs `getAll()` doing the same thing confuses consumers. Pick one. *(#245957)*
- [ ] **Correct `@since` version tags** - Wrong version tags in API annotations cause incorrect documentation. Verify the version. *(#246667)*
- [ ] **Include OAS response definitions** - API routes should have response schemas for OpenAPI spec generation. *(#246667)*
- [ ] **Don't expose internal implementation details from hooks** - Expose `getProcessedAttachments()`, not `getAttachmentContentMap()` + `updateAttachmentContent()`. *(#241260)*
- [ ] **Use snake_case for persisted structures** - Any data that gets persisted to ES must use `snake_case` field names, not `camelCase`. *(#237117)*
- [ ] **Align naming with upstream APIs** - When wrapping ES options, consider matching upstream names (`asStream` vs `stream`). *(#193060)*
- [ ] **Don't expose internal options that break if misused** - `stream: false` on the ES|QL async search strategy caused errors. Internal implementation details should not be configurable. *(#193060)*
- [ ] **Prefix usage counters with plugin namespace** - Counter names like `onechat_tool_call_*` should have a plugin prefix to avoid potential conflicts. *(#241756)*

## 6. Testing

**Pattern**: Missing tests for extracted logic, new features, or complex components.

- [ ] **Unit test extracted logic** - When moving logic to a new function/module, add unit tests for it. *(#251191, #241260)*
- [ ] **Add functional tests for new features** - Don't rely only on unit tests for user-facing features. Reviewers have written FTR tests themselves when missing. *(#176202, #175808)*
- [ ] **Test ES|QL operations** - ES|QL query building, parsing, and execution paths need dedicated test coverage. *(#196049)*
- [ ] **Test complex components** - Components with conditional rendering, multiple states, or external data dependencies need tests. *(#249996)*
- [ ] **Add regression tests for bug fixes** - Every bug fix should include a test that would have caught the bug. *(#196049)*
- [ ] **Don't delete tests without relocating them** - When moving code to a new file, move the corresponding tests too. *(#193060)*

## 7. Code Quality & Cleanup

**Pattern**: Leftover artifacts from development that shouldn't reach review.

- [ ] **Remove commented-out code** - Commented-out code is noise. If it's not needed, delete it. Git preserves history. *(#233813, #208354, #169750)*
- [ ] **Remove dead code and unused parameters** - Parameters like `disableCaching` that are never read, unreachable code paths, unused variables. *(#180440, #196049, #174246)*
- [ ] **Update or remove stale comments** - Comments that describe old behavior or reference removed code are misleading. *(#234262, #174246, #171081)*
- [ ] **Use constants instead of magic strings** - Repeated string literals should be constants. Don't create duplicate constants for the same value. *(#234262, #233601, #237117, #241658)*
- [ ] **Remove unused imports** - Clean up imports after refactoring. *(#233601)*
- [ ] **Remove debug/test code** - Console.logs, test data, debug flags must not be in the PR. *(#243474)*
- [ ] **Check merge resolution correctness** - After resolving merge conflicts, verify the result compiles and makes logical sense. Bad merge resolutions introduce subtle bugs. *(#246488)*
- [ ] **Don't commit config file changes** - Local config overrides (e.g., `kibana.dev.yml` changes) should not be in the PR. *(#196049)*
- [ ] **Fix typos in filenames** - Filename typos (e.g., `esql_asyn_search` instead of `esql_async_search`, `get_dataet_info` instead of `get_dataset_info`) are embarrassing and hard to rename later. *(#174246, #165952)*
- [ ] **Use existing utility functions** - Before writing custom string manipulation, check for existing utilities like `sanitizeToolId`. *(#241658)*
- [ ] **Reduce duplicate code patterns** - Multiple identical early-return checks should be consolidated into one. *(#196049)*
- [ ] **Merge duplicate prompt/instruction sections** - Near-identical LLM prompt instructions confuse the model. Deduplicate them. *(#237117)*
- [ ] **Add JSDoc comments on public API surfaces** - Types and functions exposed to other plugins need documentation. *(#175808)*

## 8. Performance

**Pattern**: Unnecessary expensive operations or production performance regressions.

- [ ] **Don't deep-clone large data structures unnecessarily** - Deep cloning large GeoJSON collections or similar data is extremely expensive. Use structural sharing or shallow copies when possible. *(#222160)*
- [ ] **Don't freeze all responses in production** - `Object.freeze()` on every search response adds measurable overhead. Use only in development/test. *(#222160)*
- [ ] **Batch ES queries** - Use `mget`, `msearch`, or `terms` queries instead of looping with individual requests (N+1 pattern).
- [ ] **Filter in ES, not in code** - Don't fetch all items and filter in JavaScript. Push filters to the Elasticsearch query.
- [ ] **Cache expensive `getSpec()` calls** - DataView `getSpec()` is expensive. In a page with many charts, uncached calls degrade performance considerably. *(#169750)*
- [ ] **Scope mode-specific logic** - Don't run ES|QL-specific iteration in DSL mode. Guard with a mode check. *(#171081)*
- [ ] **Use `useMemo` / `useCallback` for expensive React computations** - Recalculating derived data on every render wastes cycles. *(#171081)*
- [ ] **Limit results from unbounded queries** - When fetching indices/fields for LLM context, cap the result count (e.g., 500 fields) to avoid token explosion. *(#165952)*

## 9. Elasticsearch & Data Layer

**Pattern**: Wrong mapping types, confused query DSL, or incorrect client usage.

- [ ] **Use `nested` type for arrays of objects** - Using `object` type for an array of objects flattens the structure and breaks queries. *(#245957)*
- [ ] **Don't confuse DSL and ES|QL schema parameters** - DSL queries and ES|QL queries have different parameter shapes. Verify you're using the right one. *(#236066)*
- [ ] **Use `asCurrentUser` for user-scoped operations** - Only use `asInternalUser` for system operations that shouldn't run as the requesting user.
- [ ] **Include `_source` filtering** - Don't fetch entire documents when you only need a few fields.
- [ ] **Remove unnecessary `useInternalUser`** - It's only needed for the default search strategy, not for ES|QL async search. *(#174246)*
- [ ] **Verify data stream support** - Index pattern queries may not return data streams. Test explicitly. *(#165952)*
- [ ] **Set ES|QL query at state root level** - Lens requires the ES|QL query at the Lens state root to identify the chart as `textBased`. Without it, the ES|QL editor won't appear. *(#236405)*

## 10. React Patterns

**Pattern**: React-specific antipatterns caught by reviewers.

- [ ] **Don't use side-effect components** - A component that exists only to run side effects (like `AttachmentMapRebuilder`) is an antipattern. Use callbacks (`onSuccess`, `useEffect`) instead. *(#241260)*
- [ ] **Don't use refs where state suffices** - Using a ref to track the "last saved" value when `useLocalStorage` already provides the current value adds unnecessary complexity. *(#240967)*
- [ ] **Use `useCallback` for callbacks passed to memoized children** - Callbacks passed to `React.memo`-wrapped components must be stable references. *(#175808)*
- [ ] **Check loading state consistently** - Use `fetchStatus === FetchStatus.LOADING || fetchStatus === FetchStatus.PARTIAL` consistently across all files, not different checks in different places. *(#175808)*
- [ ] **Use event listeners, not property assignment, for callbacks** - Setting `renderer.onAbort = callback` may overwrite existing callbacks. Use `addEventListener` pattern instead. *(#175808)*

## 11. Defensive Coding

**Pattern**: Missing guards that protect production stability.

- [ ] **Wrap telemetry/tracking in try/catch** - Telemetry failures must never crash the main execution path. Always isolate with try/catch. *(#241756)*
- [ ] **Check tool/function availability before calling** - Tools like `generate_esql` may not be available in all agent contexts. Use `toolProvider.has()` before invoking, or import the function directly. *(#237117)*
- [ ] **Validate array bounds before access** - `rule[1]` on user-configured data that isn't validated to contain arrays of 2 elements. Check bounds. *(#196049)*
- [ ] **Don't trust user-accessible storage** - Local storage values are user-accessible and can be invalid. Validate before use. *(#240967)*

## 12. i18n & User-Facing Text

**Pattern**: Internal terminology or missing translations in user-facing surfaces.

- [ ] **Don't expose internal terms to users** - Terms like "expression" (internal framework name) should never appear in user-facing error messages or UI. *(#176277)*
- [ ] **Wrap all user-facing strings in `i18n.translate()`** - Every string visible to users needs translation support. *(#196049)*
- [ ] **Use correct product terminology** - "ES|QL" not "ESQL" or "esql" in user-facing contexts. *(#177993)*
- [ ] **Use correct log levels** - Cancellation is not an error, it's a warning or debug message. Error-level logs trigger alerts. *(#176277)*
- [ ] **Cancellation should show "no results", not an error screen** - User-initiated cancellation is not an error. Don't pass an error object to the error display. *(#175808)*

## 13. Naming

**Pattern**: Misleading or inconsistent names caught by reviewers.

- [ ] **Function names should reflect determinism** - `getChartType()` implies deterministic lookup; `guessChartType()` correctly signals LLM-backed non-deterministic behavior. *(#237117)*
- [ ] **Hook names should describe behavior** - `useInitialMessage` (returns nothing, sends a message) is misleading. `useSendPredefinedInitialMessage` is clearer. *(#240967)*
- [ ] **Boolean params should read as booleans** - Name like `asExpression` (reads as "should return as expression?") instead of `expression` (ambiguous). *(#203962)*
- [ ] **Use descriptive header names** - Custom HTTP headers like `kbn-is-restored` should describe what is restored. Also define as constants. *(#193060)*

## 14. UX & Visual Consistency

**Pattern**: UI/UX issues caught by reviewers during manual testing.

- [ ] **Match existing button styles** - Cancel buttons should match the style of adjacent refresh/submit buttons. Don't use `danger` color for non-destructive actions. *(#175808)*
- [ ] **Verify EUI component props exist** - `EuiButtonIcon` doesn't support `toolTipProps`. Wrap with `EuiToolTip` manually. *(#175808)*
- [ ] **Hide internal functions from users** - System-level LLM functions should use `FunctionVisibility.System`, not be visible to end users. *(#165952)*

## 15. Pre-Submit Checklist (Quick Scan)

Run through this 30-second checklist before every PR:

1. **`git diff --stat`** - Any unexpected files? Config files? `.gitignore` changes?
2. **Search for `console.log`** - Any debug logging left?
3. **Search for `// TODO`** - Any incomplete work?
4. **Search for `any`** - Any new `any` types introduced?
5. **Search for `as `** - Any new type assertions? (This is the #1 most frequent reviewer complaint)
6. **Search for `.error(`** - Are error log calls actually errors?
7. **Search for commented-out code** - Any blocks of commented code?
8. **Check bundle size** - Did you add a new dependency to `public/`?
9. **Check test files** - Did you add/update tests for changed logic?
10. **Check async calls** - Is every async function call `await`ed (or intentionally fire-and-forget with a comment)?
11. **Check filenames** - Any typos in new file names?
12. **Manual test the feature** - Reviewers consistently find runtime bugs (brushing, filtering, chart updates) that only surface through manual testing.

---

## Top Reviewers & Their Focus Areas

Understanding what each reviewer emphasizes helps anticipate feedback:

| Reviewer | Primary Focus |
|----------|--------------|
| **deepagent** | Architecture, separation of concerns, defensive error isolation, data model correctness |
| **markov00** | Type safety, logic bugs, runtime correctness, performance, manual testing |
| **stratoula** | Functional correctness (manual testing), ES|QL-specific behavior, UX |
| **dej611** | Code quality, refactoring, i18n, Lens architecture |
| **lukasolson** | API design, unnecessary code removal, runtime edge cases |
| **davismcphee** | Discover integration patterns, consistency, React best practices, functional tests |
| **chrisbmar** | React hook design, API encapsulation, testing |
| **dgieselaar** | Architecture, LLM/token efficiency, function visibility |
| **jughosta** | Naming, performance (useMemo), import style, defensive programming |
| **crespocarlos** | Performance, null safety, API completeness, documentation |

---

*Distilled from analysis of merged PRs in elastic/kibana.*
