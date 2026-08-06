/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Template values are substituted into the static YAML files via exact-token
 * replacement, since values needed at workflow-install time (batch sizes)
 * cannot be expressed with the engine's own `${{ }}` / `{{ }}` runtime
 * templating. Used by scheduled Significant Events workflows — not by daily
 * run quotas (those are soft limits enforced outside the workflow YAML).
 */
export const renderTemplate = (
  template: string,
  values: Record<string, string | number | boolean>
): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );
