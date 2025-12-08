/**
 * @name Unbounded array in API route validation
 * @description Detects schema.arrayOf() calls without maxSize constraint in API route validation,
 *              which could lead to Denial of Service (DoS) vulnerabilities.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision high
 * @id js/kibana/unbounded-array-in-route
 * @tags security
 *       dos
 *       kibana
 */

import javascript

/**
 * Holds if the call is to schema.arrayOf from @kbn/config-schema
 */
class SchemaArrayOfCall extends CallExpr {
  SchemaArrayOfCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "arrayOf" and
      pa.getBase().(VarAccess).getName() = "schema"
    )
  }

  /**
   * Checks if maxSize is specified in the options argument
   */
  predicate hasMaxSize() {
    exists(ObjectExpr opts |
      opts = this.getArgument(1) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "maxSize"
      )
    )
  }
}

/**
 * Holds if the expression is within a route validation context
 */
predicate isInRouteValidationContext(Expr e) {
  // Check if it's part of a validate object in router.post/get/put/delete
  exists(ObjectExpr validateObj, Property validateProp |
    validateProp.getName() = "validate" and
    validateProp.getInit() = validateObj and
    validateObj.getAProperty().getInit().getAChildExpr*() = e
  )
  or
  // Check if it's part of body/query/params schema
  exists(Property p |
    p.getName() = ["body", "query", "params"] and
    p.getInit().getAChildExpr*() = e
  )
  or
  // Check if it's part of a route repository params
  exists(Property p |
    p.getName() = "params" and
    p.getInit().getAChildExpr*() = e and
    // Ensure it's in a route definition context (has endpoint property)
    exists(ObjectExpr routeObj |
      routeObj.getAProperty() = p and
      exists(Property endpointProp |
        endpointProp = routeObj.getAProperty() and
        endpointProp.getName() = "endpoint"
      )
    )
  )
}

/**
 * Identifies schema.arrayOf calls that appear to be in response schemas (not request validation)
 */
predicate isInResponseContext(Expr e) {
  exists(Property p |
    p.getName() = ["response", "200", "201", "400", "401", "403", "404", "500"] and
    p.getInit().getAChildExpr*() = e
  )
}

from SchemaArrayOfCall arrayCall
where
  not arrayCall.hasMaxSize() and
  isInRouteValidationContext(arrayCall) and
  not isInResponseContext(arrayCall)
select arrayCall,
  "This schema.arrayOf() call does not specify a maxSize, which could allow unbounded input leading to DoS. Consider adding { maxSize: N } as the second argument."

