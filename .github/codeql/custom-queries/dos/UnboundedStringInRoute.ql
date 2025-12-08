/**
 * @name Unbounded string in API route validation
 * @description Detects schema.string() calls without maxLength constraint in API route validation,
 *              which could lead to Denial of Service (DoS) vulnerabilities.
 * @kind problem
 * @problem.severity warning
 * @security-severity 5.5
 * @precision medium
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
   * Checks if the string has a hostname validation (implicitly bounded)
   */
  predicate hasHostname() {
    exists(ObjectExpr opts |
      opts = this.getArgument(0) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "hostname"
      )
    )
  }

  /**
   * Checks if string has custom validate function (may have bounds)
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
}

/**
 * Holds if the expression is within a route request body validation context
 * We focus on body since strings in query/path are typically bounded by URL limits
 */
predicate isInRouteBodyContext(Expr e) {
  // Check if it's part of a body schema in validate object
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
  // Check if it's part of a route repository params body
  exists(Property bodyProp, ObjectExpr paramsObj |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    paramsObj.getAProperty() = bodyProp and
    exists(Property paramsProp |
      paramsProp.getName() = "params" and
      paramsProp.getInit() = paramsObj
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

/**
 * Checks if the string is likely an identifier (short by nature)
 * based on the property name it's assigned to
 */
predicate isLikelyIdentifier(SchemaStringCall call) {
  exists(Property p |
    p.getInit() = call and
    p.getName().regexpMatch("(?i).*(id|uuid|guid|key|name|type|status|state|code)$")
  )
}

from SchemaStringCall stringCall
where
  not stringCall.hasMaxLength() and
  not stringCall.hasHostname() and
  not stringCall.hasCustomValidate() and
  isInRouteBodyContext(stringCall) and
  not isInResponseContext(stringCall) and
  not isLikelyIdentifier(stringCall)
select stringCall,
  "This schema.string() call in a request body does not specify a maxLength, which could allow unbounded input leading to DoS. Consider adding { maxLength: N }."

