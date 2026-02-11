/**
 * @name Use of dangerouslySetInnerHTML
 * @description Detects uses of dangerouslySetInnerHTML in React components,
 *              including indirect uses via object spreading. This property
 *              bypasses React's built-in XSS protection and can lead to
 *              cross-site scripting vulnerabilities if the value contains
 *              unsanitized user input (e.g. data from Elasticsearch indices).
 * @kind problem
 * @problem.severity warning
 * @security-severity 6.1
 * @precision medium
 * @id js/kibana/dangerously-set-inner-html
 * @tags security
 *       xss
 *       react
 *       kibana
 */

import javascript

/**
 * A property assignment or object literal property where the key is "dangerouslySetInnerHTML".
 * Covers both direct JSX attributes and indirect usage via object literals
 * that may be spread into JSX elements.
 */
from Property prop
where
  prop.getName() = "dangerouslySetInnerHTML" and
  // Exclude test files, mocks, and storybook
  not prop.getFile().getRelativePath().regexpMatch(".*(\\.test\\.|__tests__|__mocks__|__fixtures__|__stories__|storybook|\\.mock\\.).*")
select prop,
  "Use of dangerouslySetInnerHTML bypasses React's XSS protection. " +
  "Ensure the value is properly sanitized, especially if it originates from Elasticsearch or user input."
