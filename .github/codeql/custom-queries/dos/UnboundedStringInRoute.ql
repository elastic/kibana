/**
 * @name Unbounded string in API route validation
 * @description Detects schema.string() calls without maxLength constraint in API route request body
 *              validation, which could lead to Denial of Service (DoS) vulnerabilities.
 *              All strings in request bodies should have explicit length limits.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.0
 * @precision high
 * @id js/kibana/unbounded-string-in-route
 * @tags security
 *       dos
 *       kibana
 */

import javascript

/**
 * Holds if the call is to schema.string from @kbn/config-schema
 */
class SchemaStringCall extends CallExpr {
  SchemaStringCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "string" and
      pa.getBase().(VarAccess).getName() = "schema"
    )
  }

  /**
   * Checks if maxLength is specified in the options argument
   */
  predicate hasMaxLength() {
    exists(ObjectExpr opts |
      opts = this.getArgument(0) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "maxLength"
      )
    )
  }

  /**
   * Checks if the string has a hostname validation (implicitly bounded by RFC 1123)
   */
  predicate hasHostname() {
    exists(ObjectExpr opts |
      opts = this.getArgument(0) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "hostname" and
        p.getInit().(BooleanLiteral).getValue() = "true"
      )
    )
  }

  /**
   * Checks if string has custom validate function that may enforce length limits.
   * Note: Custom validators should still ideally specify maxLength for clarity,
   * but we assume the validator handles bounds checking.
   */
  predicate hasCustomValidate() {
    exists(ObjectExpr opts |
      opts = this.getArgument(0) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "validate"
      )
    )
  }

  /**
   * Gets the property name this string schema is assigned to, if any
   */
  string getPropertyName() {
    exists(Property p |
      p.getInit() = this and
      result = p.getName()
    )
  }
}

/**
 * Holds if the expression is within a route request body validation context.
 * We focus on body since strings in query/path are typically bounded by URL limits.
 */
predicate isInRouteBodyContext(Expr e) {
  // Direct router pattern: router.post({ validate: { body: ... } })
  exists(ObjectExpr validateObj, Property bodyProp |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    exists(Property validateProp |
      validateProp.getName() = "validate" and
      validateProp.getInit() = validateObj and
      bodyProp = validateObj.getAProperty()
    )
  )
  or
  // Server route repository pattern with t.type/z.object for params
  exists(Property bodyProp |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    exists(Property paramsProp, ObjectExpr routeObj |
      paramsProp.getName() = "params" and
      paramsProp.getInit().getAChildExpr*() = bodyProp and
      routeObj.getAProperty() = paramsProp and
      // Ensure it's a route definition (has endpoint property)
      exists(Property endpointProp |
        endpointProp = routeObj.getAProperty() and
        endpointProp.getName() = "endpoint"
      )
    )
  )
}

/**
 * Identifies schema.string calls that appear to be in response schemas (not request validation)
 */
predicate isInResponseContext(Expr e) {
  exists(Property p |
    p.getName() = ["response", "200", "201", "400", "401", "403", "404", "500"] and
    p.getInit().getAChildExpr*() = e
  )
}

from SchemaStringCall stringCall
where
  // Must be in a route body context
  isInRouteBodyContext(stringCall) and
  // Must not be in a response schema
  not isInResponseContext(stringCall) and
  // Must not have explicit maxLength
  not stringCall.hasMaxLength() and
  // Must not have hostname validation (implicitly bounded)
  not stringCall.hasHostname() and
  // Must not have custom validate function (assumed to handle bounds)
  not stringCall.hasCustomValidate()
select stringCall,
  "schema.string() in request body for field '" + stringCall.getPropertyName() +
    "' does not specify maxLength. All strings in request bodies should have explicit length limits to prevent DoS. Add { maxLength: N } or use a custom validate function."

