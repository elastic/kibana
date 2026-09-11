/**
 * @name Unsafe dynamic HTTP request path
 * @description Detects a dynamically-constructed string (template literal,
 *              concatenation or `join`) that flows into the path of a browser
 *              `http.*` request without being encoded via `buildPath()`
 *              (`@kbn/core-http-browser`) or `encodeURIComponent()`. Unencoded
 *              path parameters allow path traversal / IDOR (e.g. an `id` of
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

/** A call to `encodeURIComponent(...)` or `buildPath(...)` (identifier or member callee). */
predicate isEncodeOrBuildPathCall(Expr e) {
  e.(CallExpr).getCalleeName() = ["encodeURIComponent", "buildPath"]
}

/**
 * Holds if the value of `e` comes from an `encodeURIComponent(...)` / `buildPath(...)`
 * call, even when it was assigned to a variable first
 * (`const encoded = encodeURIComponent(id); ... `/x/${encoded}``). The unsafe side of
 * this query follows values across assignments, so the safe side has to as well -
 * otherwise hoisting the encode call out of the template turns an already-correct call
 * site into a false positive.
 */
predicate isEncodedValue(Expr e) {
  isEncodeOrBuildPathCall(DataFlow::valueNode(e).getALocalSource().asExpr())
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
}

/** Holds if the template literal contains at least one interpolated expression. */
predicate templateHasInterpolation(TemplateLiteral t) {
  exists(Expr part | part = t.getAnElement() and not part instanceof TemplateElement)
}

/**
 * An `[...].join(sep)` call whose array has at least one unsafe element. The shared
 * `StringConcatenation` library only models `join` with an empty separator, so a path
 * assembled as `[BASE, id].join('/')` needs its own source.
 */
predicate isUnsafeJoinPath(Expr e) {
  exists(DataFlow::ArrayCreationNode arr, DataFlow::MethodCallNode call |
    e = call.asExpr() and
    call = arr.getAMethodCall("join") and
    exists(DataFlow::Node el | el = arr.getAnElement() and not isSafePathSegment(el.asExpr()))
  )
}

/**
 * An expression that builds a path dynamically with at least one unsafe (non-literal,
 * non-encoded, non-constant) segment: an interpolated template literal, a `+`
 * concatenation that is not fully sanitized, or an `[...].join(sep)` over unsafe parts.
 * Only those that actually reach an `http.*` path sink are reported, so unrelated
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
