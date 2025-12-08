/**
 * @name Unbounded Zod array in API route validation
 * @description Detects z.array() calls from Zod without .max() constraint in API route validation,
 *              which could lead to Denial of Service (DoS) vulnerabilities.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision high
 * @id js/kibana/zod-unbounded-array-in-route
 * @tags security
 *       dos
 *       kibana
 *       zod
 */

import javascript

/**
 * Holds if the call is to z.array from Zod
 */
class ZodArrayCall extends CallExpr {
  ZodArrayCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "array" and
      pa.getBase().(VarAccess).getName() = "z"
    )
  }
}

/**
 * Gets the root receiver of a method chain.
 * For `z.array(z.string()).min(1).max(100)`, returns `z.array(z.string())`.
 */
Expr getChainRoot(Expr e) {
  if e instanceof MethodCallExpr
  then result = getChainRoot(e.(MethodCallExpr).getReceiver())
  else result = e
}

/**
 * Checks if the array call has a bounding method somewhere in its method chain.
 * Handles patterns like:
 *   - z.array(z.string()).max(100)
 *   - z.array(z.string()).min(1).max(100)
 *   - z.array(z.string()).length(5)
 *   - z.array(z.string()).refine(...)
 */
predicate hasMaxConstraint(ZodArrayCall arrayCall) {
  exists(MethodCallExpr chainedCall |
    // The chained call has a bounding method name
    chainedCall.getMethodName() = ["max", "length", "refine"] and
    // The array call is the root of the method chain
    getChainRoot(chainedCall) = arrayCall
  )
}

/**
 * Holds if the expression is within a route repository params context
 * (Zod is used with the server-route-repository pattern)
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
  // Check if it's part of body in z.object params
  exists(CallExpr objectCall, Property bodyProp |
    objectCall.getCallee().(PropAccess).getPropertyName() = "object" and
    objectCall.getCallee().(PropAccess).getBase().(VarAccess).getName() = "z" and
    exists(ObjectExpr typeObj |
      typeObj = objectCall.getArgument(0) and
      bodyProp = typeObj.getAProperty() and
      bodyProp.getName() = "body" and
      bodyProp.getInit().getAChildExpr*() = e
    )
  )
  or
  // Check for versioned router validation patterns
  exists(Property p |
    p.getName() = "body" and
    p.getInit().getAChildExpr*() = e and
    exists(Property validateProp |
      validateProp.getName() = "validate" and
      validateProp.getInit().getAChildExpr*() = p
    )
  )
}

/**
 * Checks if the array call is in a location that's likely part of query parameters
 */
predicate isInQueryContext(ZodArrayCall call) {
  exists(Property p |
    p.getName() = "query" and
    p.getInit().getAChildExpr*() = call
  )
}

from ZodArrayCall arrayCall
where
  isInRouteRepositoryContext(arrayCall) and
  not hasMaxConstraint(arrayCall) and
  not isInQueryContext(arrayCall)
select arrayCall,
  "This Zod z.array() call does not have a .max() constraint, which could allow unbounded input leading to DoS. Consider adding .max(N) to limit the array size."

