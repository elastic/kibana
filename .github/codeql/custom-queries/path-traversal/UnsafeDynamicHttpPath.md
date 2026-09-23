# UnsafeDynamicHttpPath.ql

- **ID**: `js/kibana/unsafe-dynamic-http-path`
- **Kind**: `path-problem` (data-flow)
- **Severity**: Error (security-severity 7.5)
- **Description**: Detects a dynamically-built string (template literal, `+` concatenation, `+=` accumulation or `join(sep)` over an array) that flows into the path of a browser `http.*` request without `buildPath()` (`@kbn/core-http-browser`) or `encodeURIComponent()`. Unencoded path parameters allow path traversal / IDOR.

This is the data-flow companion to the `@kbn/eslint/no_unsafe_dynamic_http_path` ESLint rule. The ESLint rule only checks the inline path expression at the call site; this query follows the value across variables, helper-function returns, and files.

- **Fix**: encode path parameters with `buildPath()`:
  ```typescript
  // Before (vulnerable)
  http.delete(`/api/dashboards/${id}`);

  // After (safe)
  http.delete(buildPath('/api/dashboards/{id}', { id }));
  ```
  or wrap each dynamic segment in `encodeURIComponent()`:
  ```typescript
  http.delete('/api/dashboards/' + encodeURIComponent(id));
  ```

- **Suppression**: for a verified false positive (a segment that is genuinely constant / not user-controllable), add the suppression on the line immediately above the reported location (the `path` property write for a composed options object, otherwise the call):
  ```typescript
  // codeql[js/kibana/unsafe-dynamic-http-path] reason
  ```

## Notes

- Kibana's CodeQL analysis runs with `CODEQL_EXTRACTOR_JAVASCRIPT_OPTION_SKIP_TYPES`, so the `http` receiver and path argument are matched syntactically (identifier `http`, or any property access ending in `.http`), mirroring the ESLint rule.
- `buildPath()` and `encodeURIComponent()` results break the flow and are not reported, whether called inline or assigned to a variable first. Non-`http` receivers (e.g. `client.delete(...)`) are not matched.
- Both sanitizers are **resolved, not matched by name**. `buildPath()` must be the one imported from `@kbn/core-http-browser`, so the unrelated local helpers of that name elsewhere in Kibana are not trusted; `encodeURIComponent` must be the global builtin, so a local pass-through that shadows it is not either. A member callee (`window.encodeURIComponent(x)`) still counts.
- `buildPath()` only counts as an encoder when its route template cannot itself carry a dynamic segment (a literal, a constant reference, or a template built only from those). It URI-encodes the values it substitutes for `{param}` placeholders and returns the template otherwise unchanged, so `buildPath(id)` returns `id` verbatim and still reports. For the same reason `map(buildPath)` is not an encoding callback, while `map(encodeURIComponent)` is.
- A helper that wraps the encoder (`const encodeURIComponentIfNotEmpty = (val) => encodeURIComponent(val || '')`) is also treated as safe, including when it is imported from another file. Every return of the helper must be an encoder result **or a call to another such helper**, and the helper must not be able to fall through, so a chain of wrappers is followed but a helper that encodes on only one branch still reports. A call whose callee cannot be resolved is deliberately *not* assumed safe, and neither is a helper that can only reach an encoder through itself.
- A variable is safe only if **every** value that can reach it is encoded, so `if (c) { p = encodeURIComponent(id); } else { p = id; }` still reports.
- Array spreads are enumerated, and are safe only when the spread operand is itself safe: `[BASE, ...parts].join('/')` is reported, `[...CONSTANT_SEGMENTS].join('/')` is not.
- A joined array is tracked past its literal: elements added with `push`/`unshift`/`splice`, and `concat`/`filter`/`slice`/`flat`/`reverse`/`sort` chains, are all followed. The mutation and `concat` branches run over the whole lineage, not just the array literal, so a segment introduced after a transform is still reported: `[BASE].filter(Boolean).concat(id).join('/')`. `map()` preserves the elements unless its callback is an encoder, so `[BASE, id].map(encodeURIComponent).join('/')` is not reported. A callback that can hold more than one function encodes only when **every** one of them does, so `map(cond ? encodeSeg : passThrough)` still reports. `concat()` flattens one level, so an array argument is judged by its elements: `.concat(['status'])` is safe, `.concat([id])` is not. Mutation is matched on the array's SSA value, so a `push` that happens *after* the `join` does not retroactively flag the earlier call.
- The object overload is tracked through spread composition, so `const opts = { path: ... }; http.fetch({ ...opts, method })` reports. The alert lands on the `path` property write rather than on the `fetch` call, since that is where the fix belongs.
- A `join()` separator lands between every pair of elements, so it is checked too: `[BASE, 'status'].join(id)` is reported even though both elements are constant. A separator that is a literal, a constant reference, or a variable that only ever holds one of those is safe, and a no-argument `join()` (which defaults to `,`) is safe.
- `+=` accumulation reports on the same terms as `+`: `let p = '/api/things/'; p += id;` is reported, matching `'/api/things/' + id`, while appending a literal or an encoded segment is not.
- Literal segments are safe, so `` `/api/x/${1}` `` is not reported, matching the ESLint rule's handling of literals.
- Known gap: a path whose only dynamic part is a bare variable that was never constructed (`http.get(props.href)`) is not reported.
- Known gap: a value introduced by a callback or by a later mutation of a `concat` argument is not reported. `[BASE].map(() => id).join('/')` is missed, and so is `const extra = []; extra.push(id); [BASE].concat(extra).join('/')`, because both arrays hold only safe elements when they are created.
- Known gap: `+=` carries the appended value, not the value already in the variable. ``let p = `/api/${id}`; p += '/status';`` is not reported, while the reverse order is.
- For the object overload, a `path` that arrives through a spread is reported even when a later property overrides it. The alert names code that does build an unencoded path, so it stays.
