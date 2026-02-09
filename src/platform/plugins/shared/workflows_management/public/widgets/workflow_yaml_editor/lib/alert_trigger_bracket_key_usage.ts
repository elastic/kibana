/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Detects if the YAML content uses bracket notation with dotted keys in variables,
 * e.g. `event.alerts[0]['kibana.alert.rule.name']` or `["kibana.alert.status"]`.
 * Such usage is deprecated in favor of dot notation when using alert triggers.
 */
export function hasBracketDottedKeyUsage(yamlContent: string): boolean {
  // Match ['...'] or ["..."] where the quoted string contains at least one dot
  // Covers Liquid/template expressions like {{ event.alerts[0]['kibana.alert.rule.name'] }}
  const singleQuoted = /\['[^']*\.[^']*'\]/;
  const doubleQuoted = /\["[^"]*\.[^"]*"\]/;
  return singleQuoted.test(yamlContent) || doubleQuoted.test(yamlContent);
}
