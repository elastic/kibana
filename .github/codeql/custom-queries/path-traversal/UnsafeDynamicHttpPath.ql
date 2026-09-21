/**
 * @name Unsafe dynamic HTTP request path
 * @description Detects a dynamically-constructed string (template literal,
 *              concatenation or `join`) that flows into the path of a browser
 *              `http.*` request without being encoded via `buildPath()`
 *              (`@kbn/core-http-browser`), `encodeURIComponent()`, or a helper
 *              that only ever returns one of those. Unencoded path parameters
 *              allow path traversal / IDOR (e.g. an `id` of
 *              `../../../internal/security/users/foo`).
 * @kind path-problem
 * @problem.severity error
 * @security-severity 7.5
 * @precision medium
 * @id js/kibana/unsafe-dynamic-http-path
 * @tags security
 *       kibana
 *       path-injection
 *       external/cwe/cwe-022
 *       external/cwe/cwe-099
 */

/*
 * This is the data-flow companion to the `@kbn/eslint/no_unsafe_dynamic_http_path`
 * ESLint rule. That rule only inspects the path expression written *inline* at the
 * call site; it explicitly cannot follow a path built into a variable, returned
 * from a helper, or assembled across files. This query closes that gap: it reports
 * an unsafe dynamic path when it *reaches* an `http.*` request path through value
 * flow, no matter how many hops away it was constructed.
 *
 * Kibana's CodeQL analysis runs with CODEQL_EXTRACTOR_JAVASCRIPT_OPTION_SKIP_TYPES
 * enabled, so TypeScript types are unavailable. The `http` receiver and the path
 * argument are therefore matched syntactically, mirroring the ESLint rule's
 * heuristics (identifier `http`, or any property access ending in `.http`).
 *
 * Expected false positives: a dynamic path assembled only from values the developer
 * knows are safe (e.g. a controlled enum) is still flagged, because the query cannot
 * prove the segment is non-user-controllable. Fix by using `buildPath()` /
 * `encodeURIComponent()`, or suppress a verified false positive with a line above:
 *   // codeql[js/kibana/unsafe-dynamic-http-path] reason
 */

import javascript

/* ---------- "Safe" path building blocks (mirrors the ESLint rule) ---------- */

/** A direct call to `encodeURIComponent(...)` or `buildPath(...)` (identifier or member callee). */
predicate isDirectEncodeCall(Expr e) {
  // Exact names only. `encodeURI` is deliberately NOT here: it does not escape `/` or `.`, so
  // `../../` survives it. Exact equality also keeps `buildDeletePath` from matching `buildPath`.
  e.(CallExpr).getCalleeName() = ["encodeURIComponent", "buildPath"]
}

/** Holds if EVERY local source of `e` is a direct encoder call. */
predicate isDirectlyEncodedValue(Expr e) {
  forex(Expr src | src = DataFlow::valueNode(e).getALocalSource().asExpr() | isDirectEncodeCall(src))
}

/**
 * Holds if every way out of `f` returns a value: a concise arrow body, or a block ending in
 * `return <expr>` with no bare `return;`. A function that can fall through returns `undefined`,
 * which is not an encoded value.
 */
predicate alwaysReturnsAValue(Function f) {
  f.getBody() instanceof Expr
  or
  exists(BlockStmt body | body = f.getBody() |
    body.getStmt(body.getNumStmt() - 1) instanceof ReturnStmt and
    not exists(ReturnStmt r | r = f.getAReturnStmt() and not exists(r.getExpr()))
  )
}

/**
 * A function that exists only to encode: every value it can return is a direct encoder result.
 * Models Kibana helpers such as
 * `const encodeURIComponentIfNotEmpty = (val?: string) => encodeURIComponent(val || '');`.
 * Wrapping the encoder in a small helper is a common idiom; without this every call site of such
 * a helper is a false positive. A helper with even one unencoded return does not qualify.
 */
predicate isEncodingWrapperFunction(Function f) {
  exists(f.getAReturnedExpr()) and
  alwaysReturnsAValue(f) and
  forall(Expr ret | ret = f.getAReturnedExpr() | isDirectlyEncodedValue(ret))
}

/**
 * A call to an encoding wrapper. `forex` rather than `forall` so a call whose callee cannot be
 * resolved is not assumed safe, and a call with several possible callees is safe only when all of
 * them are wrappers. `getACallee()` is call-graph backed, so it also resolves a wrapper imported
 * from another module - unlike `getResolvedCallee()`, which needs the TypeScript types that
 * `CODEQL_EXTRACTOR_JAVASCRIPT_OPTION_SKIP_TYPES` strips.
 */
predicate isEncodingWrapperCall(Expr e) {
  exists(DataFlow::InvokeNode call | call.asExpr() = e |
    forex(Function f | f = call.getACallee() | isEncodingWrapperFunction(f))
  )
}

/** A call whose result is URI-encoded: a direct encoder call, or a call to an encoding wrapper. */
predicate isEncodeOrBuildPathCall(Expr e) {
  isDirectEncodeCall(e)
  or
  isEncodingWrapperCall(e)
}

/**
 * Holds if the value of `e` comes from an `encodeURIComponent(...)` / `buildPath(...)`
 * call, even when it was assigned to a variable first
 * (`const encoded = encodeURIComponent(id); ... `/x/${encoded}``). The unsafe side of
 * this query follows values across assignments, so the safe side has to as well -
 * otherwise hoisting the encode call out of the template turns an already-correct call
 * site into a false positive.
 *
 * `forex`, so a variable that is only *sometimes* encoded
 * (`if (c) { e = encodeURIComponent(v); } else { e = v; }`) is not treated as safe.
 */
predicate isEncodedValue(Expr e) {
  forex(Expr src | src = DataFlow::valueNode(e).getALocalSource().asExpr() |
    isEncodeOrBuildPathCall(src)
  )
}

/**
 * A screaming-case identifier (`INTERNAL_ROUTES`, `MY_CONSTANT`) or a property-access
 * chain rooted in one (`INTERNAL_ROUTES.JOBS.DELETE_PREFIX`). Treated as a constant,
 * non-user-controllable path prefix, consistent with the ESLint rule.
 */
predicate isConstantPrefixRef(Expr e) {
  e.(VarAccess).getName().regexpMatch("[A-Z][A-Z0-9_]*")
  or
  isConstantPrefixRef(e.(PropAccess).getBase())
}

/**
 * Holds if `e` is a path fragment that cannot introduce an unencoded, user-controllable
 * segment: a literal, an `encodeURIComponent`/`buildPath` result (inline or via a
 * variable), a constant prefix reference, or a template/concatenation/conditional
 * composed only of safe parts.
 *
 * `Literal` rather than `StringLiteral` so a numeric or boolean segment (`` `/x/${1}` ``)
 * is safe, matching `no_unsafe_dynamic_http_path`'s `isSafePathSegmentExpression`.
 * `TemplateLiteral` is not a `Literal`, so this does not whitelist templates.
 */
predicate isSafePathSegment(Expr e) {
  e instanceof Literal
  or
  isEncodeOrBuildPathCall(e)
  or
  isEncodedValue(e)
  or
  isConstantPrefixRef(e)
  or
  // A concatenation is safe only if BOTH operands are safe.
  e instanceof AddExpr and
  isSafePathSegment(e.(AddExpr).getLeftOperand()) and
  isSafePathSegment(e.(AddExpr).getRightOperand())
  or
  // A template literal is safe only if EVERY interpolated expression is safe. The
  // `e instanceof TemplateLiteral` guard is required: without it the `forall` would
  // range over an empty set for non-template expressions and be vacuously true.
  e instanceof TemplateLiteral and
  forall(Expr part |
    part = e.(TemplateLiteral).getAnElement() and not part instanceof TemplateElement
  |
    isSafePathSegment(part)
  )
  or
  // A conditional is safe only if BOTH branches are safe.
  e instanceof ConditionalExpr and
  isSafePathSegment(e.(ConditionalExpr).getConsequent()) and
  isSafePathSegment(e.(ConditionalExpr).getAlternate())
  or
  // `getAnElement()` on an array literal yields the `SpreadElement` node itself, and a
  // SpreadElement matches none of the cases above - so `[BASE, ...parts].join('/')` is already
  // unsafe. This disjunct only carves out the case where the spread operand is itself safe
  // (`[...CONSTANT_SEGMENTS]`); `[BASE, ...parts]` stays unsafe.
  isSafePathSegment(e.(SpreadElement).getOperand())
}

/** Holds if the template literal contains at least one interpolated expression. */
predicate templateHasInterpolation(TemplateLiteral t) {
  exists(Expr part | part = t.getAnElement() and not part instanceof TemplateElement)
}

/** A callback that encodes each element it is applied to (`map(encodeURIComponent)`). */
predicate isEncodingCallback(DataFlow::Node cb) {
  cb.asExpr().(VarAccess).getName() = ["encodeURIComponent", "buildPath"]
  or
  isEncodingWrapperFunction(cb.getALocalSource().(DataFlow::FunctionNode).getFunction())
}

/**
 * An array whose joined form may contain an unencoded, user-controllable segment: an array
 * literal (or `Array(...)`) with an unsafe element - initial, spread, or added after creation -
 * or an element-preserving transform of such an array.
 */
DataFlow::SourceNode unsafeSegmentArray() {
  exists(DataFlow::ArrayCreationNode arr, DataFlow::Node el |
    result = arr and
    (
      el = arr.getAnElement()
      or
      // `const parts = [BASE]; parts.push(id); parts.join('/')`
      el = arr.getAMethodCall(["push", "unshift"]).getAnArgument()
      or
      // `splice(start, deleteCount, ...items)` - only the inserted items are path segments;
      // including the first two would flag a plain `splice(i, 1)` removal.
      exists(int i | i >= 2 | el = arr.getAMethodCall("splice").getArgument(i))
    ) and
    not isSafePathSegment(el.asExpr())
  )
  or
  // These keep whatever elements were already unsafe: `[BASE, id].filter(Boolean).join('/')`.
  result =
    unsafeSegmentArray().getAMethodCall(["concat", "filter", "slice", "flat", "reverse", "sort"])
  or
  // `[BASE].concat(parts)` - `concat` can also introduce a new unsafe element.
  exists(DataFlow::MethodCallNode concatCall, DataFlow::Node arg |
    concatCall = any(DataFlow::ArrayCreationNode arr).getAMethodCall("concat") and
    result = concatCall and
    arg = concatCall.getAnArgument() and
    not isSafePathSegment(arg.asExpr())
  )
  or
  // `[a, b].map(fn)` keeps the elements unsafe unless `fn` encodes them.
  exists(DataFlow::MethodCallNode mapCall |
    mapCall = unsafeSegmentArray().getAMethodCall("map") and
    result = mapCall and
    not isEncodingCallback(mapCall.getArgument(0))
  )
}

/**
 * An `[...].join(sep)` call over an array that holds at least one unsafe segment. The shared
 * `StringConcatenation` library only models `join` with an empty separator, so a path assembled
 * as `[BASE, id].join('/')` needs its own source. The array is tracked through mutation
 * (`push`/`unshift`/`splice`) and through element-preserving transforms, so a path assembled
 * after the literal was created is still reported.
 */
predicate isUnsafeJoinPath(Expr e) { e = unsafeSegmentArray().getAMethodCall("join").asExpr() }

/**
 * An expression that builds a path dynamically with at least one unsafe (non-literal,
 * non-encoded, non-constant) segment: an interpolated template literal, a `+`
 * concatenation that is not fully sanitized, or a `join(sep)` over an array holding unsafe
 * parts. Only those that actually reach an `http.*` path sink are reported, so unrelated
 * concatenations are never surfaced. Conditionals are intentionally not sources: each
 * branch is its own source and flows through the conditional to the sink.
 */
predicate isUnsafeDynamicPath(Expr e) {
  (
    e instanceof TemplateLiteral and templateHasInterpolation(e)
    or
    e instanceof AddExpr
  ) and
  not isSafePathSegment(e)
  or
  isUnsafeJoinPath(e)
}

/* ---------- HTTP request-path sinks ---------- */

/**
 * Holds if `e` is (or ends in) an `http`-like receiver: the identifier `http`, or a
 * property access whose property is `http` (`this.http`, `getServices().http`,
 * `Legacy.shims.http`), matching `no_unsafe_dynamic_http_path`'s `isHttpReference`.
 */
predicate isHttpReceiver(Expr e) {
  e.(VarAccess).getName() = "http"
  or
  e.(PropAccess).getPropertyName() = "http"
  or
  isHttpReceiver(e.(PropAccess).getBase())
}

/** The path argument of a browser `http.*` request call. */
DataFlow::Node httpRequestPath() {
  exists(DataFlow::MethodCallNode call |
    call.getMethodName() =
      ["get", "post", "put", "delete", "patch", "head", "options", "fetch"] and
    isHttpReceiver(call.getReceiver().asExpr())
  |
    // string overload: `http.delete(path, options?)`
    result = call.getArgument(0) and
    not result.asExpr() instanceof ObjectExpr
    or
    // object overload: `http.fetch({ path, method, ... })`
    exists(DataFlow::ObjectLiteralNode opts, DataFlow::PropWrite pathProp |
      opts = call.getArgument(0).getALocalSource() and
      pathProp = opts.getAPropertyWrite() and
      pathProp.getPropertyName() = "path" and
      result = pathProp.getRhs()
    )
  )
}

/* ---------- Data-flow configuration ---------- */

module UnsafeHttpPathConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { isUnsafeDynamicPath(source.asExpr()) }

  predicate isSink(DataFlow::Node sink) { sink = httpRequestPath() }

  /**
   * Propagate a value appended with `+=`. Without this a path accumulated across
   * statements (`let p = '/api'; p += `/${id}`; http.get(p)`) never reaches the sink,
   * because plain value flow does not model concatenation.
   *
   * Deliberately narrower than `StringConcatenation::taintStep`: that also steps through
   * every `+` operand, which re-reports a nested concatenation once per sub-expression
   * (`basePath + '/' + id` sourced both at the whole expression and at `basePath + '/'`).
   * Plain `AddExpr` nodes are already sources in their own right, so only the compound
   * assignment needs a step.
   */
  predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
    exists(AssignAddExpr assign |
      node1 = assign.getRhs().flow() and
      node2 = [assign.flow(), DataFlow::lvalueNode(assign.getTarget())]
    )
  }
}

module UnsafeHttpPathFlow = DataFlow::Global<UnsafeHttpPathConfig>;

import UnsafeHttpPathFlow::PathGraph

from UnsafeHttpPathFlow::PathNode source, UnsafeHttpPathFlow::PathNode sink
where UnsafeHttpPathFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
  "This HTTP request path is built from a dynamic value ($@) that is not encoded with buildPath() or encodeURIComponent(), which may allow path traversal. Use buildPath() from '@kbn/core-http-browser' to safely encode path parameters.",
  source.getNode(), "dynamic path segment"
