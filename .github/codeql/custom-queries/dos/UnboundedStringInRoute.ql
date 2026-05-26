/**
 * @name Unbounded string in schema validation
 * @description Detects schema.string() and z.string() calls without a maximum
 *              length constraint, which could lead to Denial of Service (DoS)
 *              vulnerabilities when used to validate untrusted input.
 * @kind problem
 * @problem.severity error
 * @security-severity 7.5
 * @precision medium
 * @id js/kibana/unbounded-string-in-schema
 * @tags security
 *       dos
 *       kibana
 */

import javascript
import dos.KibanaDoSExclusions

/**
 * Gets the local variable bound to 'schema' imported from '@kbn/config-schema'
 */
LocalVariable configSchemaVariable() {
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
 * Gets the local variable bound to 'z' imported from '@kbn/zod', '@kbn/zod/v4', or 'zod'
 */
LocalVariable zodVariable() {
  exists(ImportDeclaration decl, ImportSpecifier spec |
    decl.getImportedPathExpr().getStringValue() = ["@kbn/zod", "@kbn/zod/v4", "zod"] and
    spec = decl.getASpecifier() and
    (
      spec.getImportedName() = "z"
      or
      spec instanceof ImportNamespaceSpecifier
    ) and
    result = spec.getLocal().getVariable()
  )
}

/**
 * Detects schema.string() calls from @kbn/config-schema without maxLength
 */
class ConfigSchemaStringCall extends CallExpr {
  ConfigSchemaStringCall() {
    exists(PropAccess pa, VarAccess va |
      this.getCallee() = pa and
      pa.getPropertyName() = "string" and
      pa.getBase() = va and
      va.getVariable() = configSchemaVariable()
    )
  }

  predicate hasMaxLength() {
    exists(ObjectExpr opts |
      opts = this.getArgument(0) and
      exists(Property p |
        p = opts.getAProperty() and
        p.getName() = "maxLength"
      )
    )
  }
}

/**
 * Detects z.string() calls from @kbn/zod without .max() in the method chain
 */
class ZodStringCall extends CallExpr {
  ZodStringCall() {
    exists(PropAccess pa, VarAccess va |
      this.getCallee() = pa and
      pa.getPropertyName() = "string" and
      pa.getBase() = va and
      va.getVariable() = zodVariable()
    )
  }

  predicate hasMax() {
    exists(MethodCallExpr chain |
      chain.getMethodName() = "max" and
      chain.getReceiver+() = this
    )
  }
}

from CallExpr stringCall, string message
where
  (
    stringCall instanceof ConfigSchemaStringCall and
    not stringCall.(ConfigSchemaStringCall).hasMaxLength() and
    message = "This schema.string() call does not specify a maxLength. Unbounded string input can cause Denial of Service (DoS) vulnerabilities. Consider adding { maxLength: N } as the options argument."
    or
    stringCall instanceof ZodStringCall and
    not stringCall.(ZodStringCall).hasMax() and
    message = "This z.string() call does not specify a .max() constraint. Unbounded string input can cause Denial of Service (DoS) vulnerabilities. Consider adding .max(N) to the method chain."
  ) and
  not shouldExcludeFileFromDoSRules(stringCall)
select stringCall, message
