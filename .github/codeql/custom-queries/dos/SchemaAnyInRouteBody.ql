/**
 * @name schema.any() used in API route body validation
 * @description Detects schema.any() usage in API route request body validation,
 *              which bypasses all validation and could lead to DoS or other security issues.
 * @kind problem
 * @problem.severity error
 * @security-severity 7.5
 * @precision high
 * @id js/kibana/schema-any-in-route-body
 * @tags security
 *       dos
 *       kibana
 */

import javascript

/**
 * Holds if the call is to schema.any from @kbn/config-schema
 */
class SchemaAnyCall extends CallExpr {
  SchemaAnyCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "any" and
      pa.getBase().(VarAccess).getName() = "schema"
    )
  }
}

/**
 * Holds if the expression is within a route body validation context
 */
predicate isInRouteBodyContext(Expr e) {
  // Check if it's inside a body object schema within a validate object
  exists(Property bodyProp, ObjectExpr validateObj |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    validateObj.getAProperty() = bodyProp and
    exists(Property validateProp |
      validateProp.getName() = "validate" and
      validateProp.getInit() = validateObj
    )
  )
  or
  // Check if it's part of an array in body (e.g., schema.arrayOf(schema.any()))
  exists(CallExpr arrayOf, Property bodyProp, ObjectExpr validateObj |
    arrayOf.getCallee().(PropAccess).getPropertyName() = "arrayOf" and
    arrayOf.getAnArgument().getAChildExpr*() = e and
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = arrayOf and
    validateObj.getAProperty() = bodyProp and
    exists(Property validateProp |
      validateProp.getName() = "validate" and
      validateProp.getInit() = validateObj
    )
  )
}

/**
 * Holds if the expression is within a route params context in server-route-repository
 */
predicate isInRouteRepositoryBodyContext(Expr e) {
  exists(Property bodyProp, CallExpr typeCall, ObjectExpr typeObj |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    typeObj.getAProperty() = bodyProp and
    // Inside t.type({body: ...}) or z.object({body: ...}) pattern
    typeCall.getCallee().(PropAccess).getPropertyName() = ["type", "object"] and
    typeCall.getArgument(0) = typeObj
  )
}

/**
 * Checks if any() is used with a custom validator that provides some validation
 */
predicate hasCustomValidator(SchemaAnyCall anyCall) {
  exists(ObjectExpr opts |
    opts = anyCall.getArgument(0) and
    exists(Property p |
      p = opts.getAProperty() and
      p.getName() = "validate"
    )
  )
}

from SchemaAnyCall anyCall
where
  (isInRouteBodyContext(anyCall) or isInRouteRepositoryBodyContext(anyCall)) and
  not hasCustomValidator(anyCall)
select anyCall,
  "schema.any() is used in request body validation without a custom validator, which bypasses all validation and could lead to DoS or other security issues. Consider using a specific schema type or adding a custom validate function with size limits."

