/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Liquid, Output } from 'liquidjs';

// TODO: we should use one liquid engine instace with all pipes shared
// between expression evaluation and templating
const engine = new Liquid({
  strictVariables: false,
  strictFilters: false,
});

engine.registerFilter('to_key_value', (obj: Record<string, unknown>) => {
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
});

engine.registerFilter('length', (input: unknown) => {
  if (typeof input === 'string' || Array.isArray(input)) {
    return input.length;
  }
  if (input && typeof input === 'object') {
    return Object.keys(input).length;
  }
  return 0;
});

export function evaluateExpression(template: string, context: Record<string, unknown>): unknown {
  const tmpl = engine.parse(template);

  if (tmpl.length > 1) {
    throw new Error('Only single root node templates are supported');
  }

  if (!(tmpl[0] instanceof Output)) {
    throw new Error('Only output templates are supported');
  }

  const openExpressionIndex = template.indexOf('{{');
  const closeExpressionIndex = template.lastIndexOf('}}');
  const expression = template.substring(openExpressionIndex + 2, closeExpressionIndex).trim();

  return engine.evalValueSync(expression, context);
}
