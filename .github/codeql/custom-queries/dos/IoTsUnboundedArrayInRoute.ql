/**
 * @name Unbounded io-ts array in API route validation
 * @description Detects t.array() calls from io-ts without size constraints in API route validation,
 *              which could lead to Denial of Service (DoS) vulnerabilities.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision high
 * @id js/kibana/iots-unbounded-array-in-route
 * @tags security
 *       dos
 *       kibana
 *       io-ts
 */

import javascript

/**
 * Holds if the call is to t.array from io-ts
 */
class IoTsArrayCall extends CallExpr {
  IoTsArrayCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "array" and
      pa.getBase().(VarAccess).getName() = "t"
    )
  }
}

/**
 * Checks if an expression is directly passed as an argument to a refinement/brand call.
 * Handles patterns like:
 *   - t.refinement(t.array(t.string), predicate)
 *   - t.brand(t.array(t.string), predicate, name)
 */
predicate isArgumentToRefinement(Expr e) {
  exists(CallExpr refineCall |
    (
      refineCall.getCallee().(PropAccess).getPropertyName() = "refinement" or
      refineCall.getCallee().(PropAccess).getPropertyName() = "brand"
    ) and
    refineCall.getCallee().(PropAccess).getBase().(VarAccess).getName() = "t" and
    refineCall.getArgument(0) = e
  )
}

/**
 * Checks if the array call is assigned to a variable with "bounded" or size-related name,
 * suggesting it has been wrapped with constraints elsewhere.
 */
predicate isAssignedToBoundedVariable(IoTsArrayCall arrayCall) {
  exists(VariableDeclarator vd |
    vd.getInit().getAChildExpr*() = arrayCall and
    vd.getBindingPattern().(VarDecl).getName().regexpMatch("(?i).*(bounded|limited|max|sized).*")
  )
}

/**
 * Checks if the array is used with a custom runtime type that limits size
 */
predicate hasArraySizeLimit(IoTsArrayCall arrayCall) {
  // Check if it's directly passed to t.refinement or t.brand
  isArgumentToRefinement(arrayCall)
  or
  // Check if assigned to a variable suggesting it's bounded
  isAssignedToBoundedVariable(arrayCall)
}

/**
 * Holds if the expression is within a route repository params context
 * (io-ts is primarily used with the server-route-repository pattern)
 */
predicate isInRouteRepositoryContext(Expr e) {
  // Check if it's part of route params
  exists(Property p, ObjectExpr routeObj |
    p.getName() = "params" and
    p.getInit().getAChildExpr*() = e and
    routeObj.getAProperty() = p and
    // Has endpoint property (server-route-repository pattern)
    exists(Property endpointProp |
      endpointProp = routeObj.getAProperty() and
      endpointProp.getName() = "endpoint"
    )
  )
  or
  // Check if it's part of body in params using t.type pattern
  exists(CallExpr typeCall, Property bodyProp |
    typeCall.getCallee().(PropAccess).getPropertyName() = "type" and
    typeCall.getCallee().(PropAccess).getBase().(VarAccess).getName() = "t" and
    exists(ObjectExpr typeObj |
      typeObj = typeCall.getArgument(0) and
      bodyProp = typeObj.getAProperty() and
      bodyProp.getName() = "body" and
      bodyProp.getInit().getAChildExpr*() = e
    )
  )
}

/**
 * Checks if the array call is in a location that's likely part of query parameters
 * (which are bounded by URL length limits)
 */
predicate isInQueryContext(IoTsArrayCall call) {
  exists(Property p |
    p.getName() = "query" and
    p.getInit().getAChildExpr*() = call
  )
}

from IoTsArrayCall arrayCall
where
  isInRouteRepositoryContext(arrayCall) and
  not hasArraySizeLimit(arrayCall) and
  not isInQueryContext(arrayCall)
select arrayCall,
  "This io-ts t.array() call does not have size constraints, which could allow unbounded input leading to DoS. Consider using t.refinement() to add a maximum size check or using a custom branded type."

