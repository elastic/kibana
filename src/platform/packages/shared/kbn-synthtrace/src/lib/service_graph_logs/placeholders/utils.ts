/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const getNameParts = (name: string): string[] => {
  const parts = name.trim().split(/[-_]+/).filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`Invalid service name: "${name}"`);
  }
  return parts;
};

export function toSnakeCase(name: string): string {
  return getNameParts(name).join('_');
}

export function toJavaPkg(name: string): string {
  const parts = getNameParts(name);
  const abbr = parts.map((p) => p.charAt(0)).join('.');
  return `c.${abbr}.${parts.join('')}`;
}

export function toPascalCase(name: string): string {
  return getNameParts(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function toGrpcSvc(name: string): string {
  const parts = getNameParts(name);
  const snake = parts.join('_');
  // Class name: PascalCase of full service name + "Service"
  const className = toPascalCase(name) + 'Service';
  // Method name: last word of the service name, PascalCased
  // e.g. "fraud-check" → "Check", "policy-lookup" → "Lookup", "payment-processor" → "Processor"
  const lastWord = parts[parts.length - 1];
  const method = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  return `/${snake}.v1.${className}/${method}`;
}
