/**
 * @name XSS via dangerouslySetInnerHTML with Elasticsearch data
 * @description Detects data flowing from Elasticsearch utility functions
 *              (e.g. buildDataTableRecord, getMessageFieldWithFallbacks) into
 *              dangerouslySetInnerHTML. This is a high-confidence finding since
 *              Elasticsearch indices can contain arbitrary user-controlled content.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 8.0
 * @precision high
 * @id js/kibana/es-data-xss
 * @tags security
 *       xss
 *       react
 *       kibana
 *       external/cwe/cwe-079
 */

import javascript

/**
 * Holds if `call` invokes a function named `funcName` that was imported
 * from the given `modulePath` in the same file.
 */
predicate isImportedCall(DataFlow::CallNode call, string modulePath, string funcName) {
  call.getCalleeName() = funcName and
  exists(ImportDeclaration imp |
    imp.getImportedPathExpr().getStringValue() = modulePath and
    imp.getASpecifier().getImportedName() = funcName and
    imp.getFile() = call.getFile()
  )
}

/**
 * A call to a function from @kbn/discover-utils that returns data originating
 * from Elasticsearch. These functions wrap raw ES hits or extract field values
 * from ES documents, and their return values should be treated as untrusted.
 */
class ElasticsearchDataSource extends DataFlow::CallNode {
  string funcName;

  ElasticsearchDataSource() {
    isImportedCall(this, "@kbn/discover-utils", funcName) and
    funcName =
      [
        "buildDataTableRecord", "buildDataTableRecordList",
        "getMessageFieldWithFallbacks", "getLogFieldWithFallback",
        "formatHit", "formatFieldValue"
      ]
  }

  string getFunctionName() { result = funcName }
}

/**
 * The value assigned to an `__html` property, which is the content rendered
 * by React's dangerouslySetInnerHTML. This matches both:
 *   - Direct: `<div dangerouslySetInnerHTML={{ __html: VALUE }} />`
 *   - Indirect: `const p = { dangerouslySetInnerHTML: { __html: VALUE } }; <div {...p} />`
 */
class DangerousInnerHtmlSink extends DataFlow::ValueNode {
  DangerousInnerHtmlSink() {
    exists(Property prop |
      prop.getName() = "__html" and
      this = DataFlow::valueNode(prop.getInit())
    )
  }
}

/**
 * Taint tracking configuration: flows from Elasticsearch data sources
 * to dangerouslySetInnerHTML sinks.
 */
module EsXssConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node node) { node instanceof ElasticsearchDataSource }

  predicate isSink(DataFlow::Node node) { node instanceof DangerousInnerHtmlSink }
}

module EsXssFlow = TaintTracking::Global<EsXssConfig>;

import EsXssFlow::PathGraph

from EsXssFlow::PathNode source, EsXssFlow::PathNode sink
where EsXssFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
  "Elasticsearch data from $@ flows into dangerouslySetInnerHTML, which may lead to cross-site scripting.",
  source.getNode(), source.getNode().(ElasticsearchDataSource).getFunctionName() + "()"
