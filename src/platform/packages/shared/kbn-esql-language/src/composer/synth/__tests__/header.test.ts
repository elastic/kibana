/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../../pretty_print';
import { header, hdr } from '../header';

test('can create a SET command with string value', () => {
  const node = header`SET a = "foo"`;

  expect(node.type).toBe('header-command');
  expect(node.name).toBe('set');
  expect(BasicPrettyPrinter.print(node)).toBe('SET a = "foo"');
});

test('can create a SET command with numeric value', () => {
  const node = header`SET b = 123`;

  expect(node.type).toBe('header-command');
  expect(node.name).toBe('set');
  expect(BasicPrettyPrinter.print(node)).toBe('SET b = 123');
});

test('can create a SET command with boolean value', () => {
  const node = header`SET c = true`;

  expect(node.type).toBe('header-command');
  expect(node.name).toBe('set');
  // ES|QL uses uppercase TRUE/FALSE
  expect(BasicPrettyPrinter.print(node)).toBe('SET c = TRUE');
});

test('short alias "hdr" works for SET commands', () => {
  const node = hdr`SET x = "test"`;

  expect(node.type).toBe('header-command');
  expect(node.name).toBe('set');
  expect(BasicPrettyPrinter.print(node)).toBe('SET x = "test"');
});

test('throws on invalid SET command', () => {
  expect(() => header`SET`).toThrow();
  expect(() => header`SET a`).toThrow();
  expect(() => header`FROM index`).toThrow();
});
