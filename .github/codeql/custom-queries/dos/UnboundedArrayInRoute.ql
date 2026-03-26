/**
 * @name Unbounded array in schema validation
 * @description Detects schema.arrayOf() calls without maxSize constraint,
 *              which could lead to Denial of Service (DoS) vulnerabilities
 *              when used to validate untrusted input.
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.5
 * @precision medium
 * @id js/kibana/unbounded-array-in-schema
 * @tags security
 *       dos
 *       kibana
 */

import javascript

/**
 * Gets the local variable bound to 'schema' imported from '@kbn/config-schema'
 */
LocalVariable schemaVariable() {
  exists(ImportDeclaration decl, ImportSpecifier spec |
    decl.getImportedPathExpr().getStringValue() = "@kbn/config-schema" and
    spec = decl.getASpecifier() and
    spec.getImportedName() = "schema" and
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

/**
 * Identifies files that should be excluded from analysis:
 * - config.ts files (plugin configuration, not request validation)
 * - index.ts files at plugin server root (typically re-exports)
 */
predicate isInExcludedFile(Expr e) {
  e.getFile().getBaseName() = "config.ts"
  or
  // Exclude index.ts at plugin server root: plugins/*/server/index.ts or plugins/*/*/server/index.ts
  (
    e.getFile().getBaseName() = "index.ts" and
    e.getFile().getRelativePath().regexpMatch(".*/plugins/[^/]+(/[^/]+)?/server/index\\.ts")
  )
}

from SchemaArrayOfCall arrayCall
where
  not arrayCall.hasMaxSize() and
  not isInExcludedFile(arrayCall)
select arrayCall,
  "This schema.arrayOf() call does not specify a maxSize. Unbounded input can cause Denial of Service (DoS) vulnerabilities. Consider adding { maxSize: N } as the second argument."

