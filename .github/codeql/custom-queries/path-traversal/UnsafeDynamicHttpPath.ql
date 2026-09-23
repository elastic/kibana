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

/**
 * A string expression that cannot carry a dynamic segment: a literal, a constant prefix
 * reference, or a template/concatenation built only from those - written inline or held in a
 * variable first. Used for the two positions where a value is not a path segment in its own
 * right but still ends up inside the path: a `buildPath()` route template, and a `join()`
 * separator.
 */
predicate isStaticPathText(Expr e) {
  forex(Expr src | src = DataFlow::valueNode(e).getALocalSource().asExpr() |
    src instanceof Literal
    or
    isConstantPrefixRef(src)
    or
    src instanceof TemplateLiteral and
    forall(Expr part |
      part = src.(TemplateLiteral).getAnElement() and not part instanceof TemplateElement
    |
      isStaticPathText(part)
    )
    or
    src instanceof AddExpr and
    isStaticPathText(src.(AddExpr).getLeftOperand()) and
    isStaticPathText(src.(AddExpr).getRightOperand())
  )
}

/**
 * A call to the global `encodeURIComponent`. Resolved through `globalVarRef` rather than by
 * callee name, so a local pass-through that shadows the builtin
 * (`const encodeURIComponent = (x) => x;`) is not mistaken for the real thing. A member callee
 * (`window.encodeURIComponent(x)`) is accepted too, matching the ESLint rule.
 *
 * `encodeURI` is deliberately NOT modelled: it does not escape `/` or `.`, so `../../`
 * survives it.
 */
predicate isEncodeUriComponentCall(Expr e) {
  e = DataFlow::globalVarRef("encodeURIComponent").getACall().asExpr()
  or
  e.(CallExpr).getCallee().(PropAccess).getPropertyName() = "encodeURIComponent"
}

/**
 * A `buildPath(template, params)` call whose result really is encoded. Two conditions, both
 * required:
 *
 * - it is Kibana's `buildPath`, resolved through the `@kbn/core-http-browser` import rather than
 *   by callee name. Kibana has a dozen unrelated local helpers called `buildPath` that simply
 *   interpolate their arguments, and trusting the name would treat those as sanitizers.
 * - the template argument cannot itself carry a user-controllable segment. `buildPath()`
 *   URI-encodes only the values it substitutes for `{param}` placeholders and returns the
 *   template otherwise unchanged, so a one-argument `buildPath(id)` returns `id` verbatim.
 */
predicate isEncodingBuildPathCall(Expr e) {
  exists(DataFlow::CallNode call |
    call = DataFlow::moduleMember("@kbn/core-http-browser", "buildPath").getACall() and
    e = call.asExpr() and
    isStaticPathText(call.getArgument(0).asExpr())
  )
}

/** A direct call to `encodeURIComponent(...)`, or a `buildPath(...)` call that actually encodes. */
predicate isDirectEncodeCall(Expr e) {
  isEncodeUriComponentCall(e)
  or
  isEncodingBuildPathCall(e)
}

/**
 * Holds if EVERY local source of `e` is an encoder result: a direct encoder call, or a call to
 * another encoding wrapper. Allowing the latter is what lets a wrapper chain more than one hop
 * (`const encodeSegment = (v) => encodeIfNotEmpty(v);`).
 */
predicate isEncodedReturnValue(Expr e) {
  forex(Expr src | src = DataFlow::valueNode(e).getALocalSource().asExpr() |
    isEncodeOrBuildPathCall(src)
  )
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
 * A function that exists only to encode: every value it can return is an encoder result. Models
 * Kibana helpers such as
 * `const encodeURIComponentIfNotEmpty = (val?: string) => encodeURIComponent(val || '');`.
 * Wrapping the encoder in a small helper is a common idiom; without this every call site of such
 * a helper is a false positive. A helper with even one unencoded return does not qualify.
 *
 * Mutually recursive with `isEncodingWrapperCall` via `isEncodedReturnValue`, so a helper that
 * delegates to another helper qualifies too. The recursion is monotone: every recursive call sits
 * inside a `forall`/`forex`, which desugars to a doubly-negated existential. The least fixpoint
 * also fails safe - a self-recursive or mutually-recursive helper never becomes a wrapper, so it
 * keeps reporting rather than going quiet.
 */
predicate isEncodingWrapperFunction(Function f) {
  exists(f.getAReturnedExpr()) and
  alwaysReturnsAValue(f) and
  forall(Expr ret | ret = f.getAReturnedExpr() | isEncodedReturnValue(ret))
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

/**
 * A callback that encodes each element it is applied to (`map(encodeURIComponent)`). `buildPath`
 * is deliberately absent: `map` passes each element as `buildPath()`'s *template* argument, which
 * comes back unchanged, so `map(buildPath)` encodes nothing.
 *
 * `forex` over EVERY local source, matching `isEncodingWrapperCall`: a callback that can hold
 * more than one function (`cond ? encodeSeg : (x) => x`) encodes only when all of them do. The
 * range covers every source, not just the function-valued ones, so a source that does not resolve
 * to a function fails the cast and leaves the callback unsafe.
 */
predicate isEncodingCallback(DataFlow::Node cb) {
  cb = DataFlow::globalVarRef("encodeURIComponent")
  or
  forex(DataFlow::Node src | src = cb.getALocalSource() |
    isEncodingWrapperFunction(src.(DataFlow::FunctionNode).getFunction())
  )
}

/**
 * A `concat` argument that cannot introduce an unsafe segment. `concat` flattens one level, so an
 * array argument contributes its ELEMENTS as path segments, not itself - without this
 * `[BASE].concat(['status'])` would report, because a bare array expression matches none of the
 * `isSafePathSegment` cases. `forex` over the sources, and every source must actually be an array,
 * so a value that cannot be resolved to one is not quietly assumed safe.
 */
predicate isSafeConcatArgument(DataFlow::Node arg) {
  isSafePathSegment(arg.asExpr())
  or
  forex(DataFlow::SourceNode src | src = arg.getALocalSource() |
    src instanceof DataFlow::ArrayCreationNode and
    forall(DataFlow::Node el | el = src.(DataFlow::ArrayCreationNode).getAnElement() |
      isSafePathSegment(el.asExpr())
    )
  )
}

/** An `Array.prototype` method that returns a new array holding the same elements. */
private string elementPreservingArrayMethod() {
  result = ["concat", "filter", "slice", "flat", "reverse", "sort"]
}

/**
 * An array a path may be joined from: an array literal (or `Array(...)`), or any
 * element-preserving transform of one. Tracking this *lineage* - not just the creation node - is
 * what lets the mutation and `concat` branches below still see an array that was transformed
 * before it was appended to (`[BASE].filter(Boolean).concat(id)`).
 */
DataFlow::SourceNode segmentArray() {
  result instanceof DataFlow::ArrayCreationNode
  or
  result = segmentArray().getAMethodCall([elementPreservingArrayMethod(), "map"])
}

/**
 * An array whose joined form may contain an unencoded, user-controllable segment: an array
 * literal (or `Array(...)`) with an unsafe element - initial, spread, or added after creation -
 * or an element-preserving transform of such an array.
 */
DataFlow::SourceNode unsafeSegmentArray() {
  exists(DataFlow::SourceNode arr, DataFlow::Node el |
    result = arr and
    arr = segmentArray() and
    (
      el = arr.(DataFlow::ArrayCreationNode).getAnElement()
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
  result = unsafeSegmentArray().getAMethodCall(elementPreservingArrayMethod())
  or
  // `concat` can also introduce a new unsafe element onto an array that was safe up to that
  // point - `[BASE].concat(parts)`, or `[BASE].filter(Boolean).concat(id)` once the receiver is
  // matched against the whole lineage rather than the array literal alone.
  exists(DataFlow::MethodCallNode concatCall, DataFlow::Node arg |
    concatCall = segmentArray().getAMethodCall("concat") and
    result = concatCall and
    arg = concatCall.getAnArgument() and
    not isSafeConcatArgument(arg)
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
 * A `join` separator that cannot itself introduce a dynamic segment. `isStaticPathText` rather
 * than `isSafePathSegment` alone, because a separator is routinely hoisted into a plain
 * lowercase `const sep = '/'`, which `isSafePathSegment` does not follow back to its literal.
 */
predicate isSafeJoinSeparator(Expr e) { isStaticPathText(e) or isSafePathSegment(e) }

/**
 * An `[...].join(sep)` call that may produce an unencoded path. The shared `StringConcatenation`
 * library only models `join` with an empty separator, so a path assembled as
 * `[BASE, id].join('/')` needs its own source. Two ways to be unsafe:
 *
 * - the array holds an unsafe segment. It is tracked through mutation (`push`/`unshift`/`splice`)
 *   and through element-preserving transforms, so a path assembled after the literal was created
 *   is still reported.
 * - the separator is dynamic. It lands between every pair of elements, so
 *   `[BASE, 'status'].join(id)` puts `id` in the path even though both elements are constant.
 *
 * The separator is matched inside an `exists` so that a no-argument `join()` - which defaults to
 * `','` - does not satisfy the negation vacuously.
 */
predicate isUnsafeJoinPath(Expr e) {
  e = unsafeSegmentArray().getAMethodCall("join").asExpr()
  or
  exists(DataFlow::MethodCallNode joinCall |
    joinCall = segmentArray().getAMethodCall("join") and
    e = joinCall.asExpr()
  |
    exists(Expr sep | sep = joinCall.getArgument(0).asExpr() | not isSafeJoinSeparator(sep))
  )
}

/**
 * An expression that builds a path dynamically with at least one unsafe (non-literal,
 * non-encoded, non-constant) segment: an interpolated template literal, a `+`
 * concatenation that is not fully sanitized, the appended value of a `+=`, or a `join(sep)`
 * over an array holding unsafe parts. Only those that actually reach an `http.*` path sink are
 * reported, so unrelated concatenations are never surfaced. Conditionals are intentionally not
 * sources: each branch is its own source and flows through the conditional to the sink.
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
  or
  // `let p = '/api/things/'; p += id;` - the appended value is itself the dynamic segment, and no
  // `AddExpr` is written anywhere, so without this the `+=` spelling is missed while the
  // equivalent `'/api/things/' + id` reports. `isAdditionalFlowStep` below already carries the
  // right-hand side to the assigned variable, so this needs no flow step of its own.
  exists(AssignAddExpr assign | e = assign.getRhs()) and
  not isSafePathSegment(e)
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

/**
 * An object that supplies the options of an `http.*` call: the argument itself, or an object
 * spread into it. Without the spread case, composing the options
 * (`http.fetch({ ...opts, method })`) hides the `path` property from `getAPropertyWrite()` and
 * the request path is never treated as a sink.
 */
DataFlow::SourceNode httpOptionsObject(DataFlow::MethodCallNode call) {
  result = call.getArgument(0).getALocalSource()
  or
  result =
    httpOptionsObject(call).(DataFlow::ObjectLiteralNode).getASpreadProperty().getALocalSource()
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
    // object overload: `http.fetch({ path, method, ... })`, including spread composition
    exists(DataFlow::PropWrite pathProp |
      pathProp = httpOptionsObject(call).getAPropertyWrite() and
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
