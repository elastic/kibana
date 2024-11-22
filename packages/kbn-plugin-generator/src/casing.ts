/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const words = (input: string) =>
  input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

const upperFirst = (input: string) => `${input.slice(0, 1).toUpperCase()}${input.slice(1)}`;
const lowerFirst = (input: string) => `${input.slice(0, 1).toLowerCase()}${input.slice(1)}`;

export const snakeCase = (input: string) => words(input).join('_');
export const upperCamelCase = (input: string) => words(input).map(upperFirst).join('');
export const camelCase = (input: string) => lowerFirst(upperCamelCase(input));
