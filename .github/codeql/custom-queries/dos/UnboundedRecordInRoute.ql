/**
 * @name Unbounded record/object in API route body
 * @description Detects schema.recordOf(), t.record(), or t.unknown usage in API route body validation
 *              without size constraints, which could allow unbounded input leading to DoS.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.0
 * @precision medium
 * @id js/kibana/unbounded-record-in-route
 * @tags security
 *       dos
 *       kibana
 */

import javascript

/**
 * Holds if the call is to schema.recordOf from @kbn/config-schema
 */
class SchemaRecordOfCall extends CallExpr {
  SchemaRecordOfCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "recordOf" and
      pa.getBase().(VarAccess).getName() = "schema"
    )
  }
}

/**
 * Holds if the call is to t.record from io-ts
 */
class IoTsRecordCall extends CallExpr {
  IoTsRecordCall() {
    exists(PropAccess pa |
      this.getCallee() = pa and
      pa.getPropertyName() = "record" and
      pa.getBase().(VarAccess).getName() = "t"
    )
  }
}

/**
 * Holds if the expression is to t.unknown from io-ts
 */
class IoTsUnknownAccess extends PropAccess {
  IoTsUnknownAccess() {
    this.getPropertyName() = "unknown" and
    this.getBase().(VarAccess).getName() = "t"
  }
}

/**
 * Holds if the expression is within a route body validation context
 */
predicate isInRouteBodyContext(Expr e) {
  exists(Property bodyProp, ObjectExpr validateObj |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    validateObj.getAProperty() = bodyProp and
    exists(Property validateProp |
      validateProp.getName() = "validate" and
      validateProp.getInit() = validateObj
    )
  )
}

/**
 * Holds if the expression is within a route repository body context
 */
predicate isInRouteRepositoryBodyContext(Expr e) {
  exists(Property bodyProp, CallExpr typeCall, ObjectExpr typeObj |
    bodyProp.getName() = "body" and
    bodyProp.getInit().getAChildExpr*() = e and
    typeObj.getAProperty() = bodyProp and
    typeCall.getCallee().(PropAccess).getPropertyName() = ["type", "object"] and
    typeCall.getArgument(0) = typeObj
  )
  or
  exists(Property p, ObjectExpr routeObj |
    p.getName() = "params" and
    p.getInit().getAChildExpr*() = e and
    routeObj.getAProperty() = p and
    exists(Property endpointProp |
      endpointProp = routeObj.getAProperty() and
      endpointProp.getName() = "endpoint"
    )
  )
}

from Expr unboundedExpr, string exprType
where
  (
    unboundedExpr instanceof SchemaRecordOfCall and
    exprType = "schema.recordOf()"
    or
    unboundedExpr instanceof IoTsRecordCall and
    exprType = "t.record()"
    or
    unboundedExpr instanceof IoTsUnknownAccess and
    exprType = "t.unknown"
  ) and
  (isInRouteBodyContext(unboundedExpr) or isInRouteRepositoryBodyContext(unboundedExpr))
select unboundedExpr,
  exprType +
    " is used in request body validation, which allows unbounded key-value pairs. This could lead to DoS. Consider using schema.object() with explicitly defined properties or adding custom validation to limit the number of keys."

