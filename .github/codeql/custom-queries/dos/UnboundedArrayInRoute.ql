/**
 * @name Unbounded array in schema validation
 * @description Detects schema.arrayOf() calls without maxSize constraint,
 *              which could lead to Denial of Service (DoS) vulnerabilities
 *              when used to validate untrusted input.
 * @kind problem
 * @problem.severity error
 * @security-severity 7.5
 * @precision medium
 * @id js/kibana/unbounded-array-in-schema
 * @tags security
 *       dos
 *       kibana
 */

import javascript
import dos.KibanaDoSExclusions

/**
 * Gets the local variable bound to 'schema' imported from '@kbn/config-schema'
 */
LocalVariable schemaVariable() {
  exists(ImportDeclaration decl, ImportSpecifier spec |
    decl.getImportedPathExpr().getStringValue() = "@kbn/config-schema" and
    spec = decl.getASpecifier() and
    (
      spec.getImportedName() = "schema"
      or
      spec instanceof ImportNamespaceSpecifier
    ) and
    result = spec.getLocal().getVariable()
  )
}

/**
 * Holds if the call is to schema.arrayOf from @kbn/config-schema
 */
class SchemaArrayOfCall extends CallExpr {
  SchemaArrayOfCall() {
    exists(PropAccess pa, VarAccess va |
      this.getCallee() = pa and
      pa.getPropertyName() = "arrayOf" and
      pa.getBase() = va and
      va.getVariable() = schemaVariable()
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

from SchemaArrayOfCall arrayCall
where
  not arrayCall.hasMaxSize() and
  not shouldExcludeFileFromDoSRules(arrayCall)
select arrayCall,
  "This schema.arrayOf() call does not specify a maxSize. Unbounded input can cause Denial of Service (DoS) vulnerabilities. Consider adding { maxSize: N } as the second argument."

