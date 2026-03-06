/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function toSnakeCase(name: string): string {
  return name.replace(/-/g, '_');
}

export function toJavaPkg(name: string): string {
  const parts = name.split(/[-_]/);
  const abbr = parts.map((p) => p.charAt(0)).join('.');
  return `c.${abbr}.${parts.join('')}`;
}

export function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function toGrpcSvc(name: string): string {
  const snake = toSnakeCase(name);
  // Class name: PascalCase of full service name + "Service"
  const className = toPascalCase(name) + 'Service';
  // Method name: last word of the service name, PascalCased
  // e.g. "fraud-check" → "Check", "policy-lookup" → "Lookup", "payment-processor" → "Processor"
  const lastWord = name.split(/[-_]/).pop() ?? name;
  const method = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  return `/${snake}.v1.${className}/${method}`;
}
