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
 * Checks if an expression is wrapped with a size-limiting refinement
 * e.g., t.refinement, or custom size validation
 */
predicate hasRefinementWrapper(Expr e) {
  exists(CallExpr refine |
    (
      refine.getCallee().(PropAccess).getPropertyName() = "refinement" or
      refine.getCallee().(PropAccess).getPropertyName() = "brand"
    ) and
    refine.getAnArgument().getAChildExpr*() = e
  )
}

/**
 * Checks if the array is used with a custom runtime type that limits size
 */
predicate hasArraySizeLimit(IoTsArrayCall arrayCall) {
  // Check if it's passed to a refinement or brand
  hasRefinementWrapper(arrayCall)
  or
  // Check if it's part of a NonEmptyArray type
  exists(VarAccess va |
    va.getName().matches("%NonEmpty%") and
    va.getASuccessor*() = arrayCall
  )
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

