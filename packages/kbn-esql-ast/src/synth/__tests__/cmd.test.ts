/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../pretty_print';
import { cmd } from '../cmd';
import { expr } from '../expr';

test('can create a WHERE command', () => {
  const node = cmd`WHERE coordinates.lat >= 12.123123`;
  const text = BasicPrettyPrinter.command(node);

  expect(text).toBe('WHERE coordinates.lat >= 12.123123');
});

test('can create a complex STATS command', () => {
  const node = cmd`STATS count_last_hour = SUM(count_last_hour), total_visits = SUM(total_visits), bytes_transform = SUM(bytes_transform), bytes_transform_last_hour = SUM(bytes_transform_last_hour) BY extension.keyword`;
  const text = BasicPrettyPrinter.command(node);

  expect(text).toBe(
    'STATS count_last_hour = SUM(count_last_hour), total_visits = SUM(total_visits), bytes_transform = SUM(bytes_transform), bytes_transform_last_hour = SUM(bytes_transform_last_hour) BY extension.keyword'
  );
});

test('can create a FROM source command', () => {
  const node = cmd`FROM index METADATA _id`;
  const text = BasicPrettyPrinter.command(node);

  expect(text).toBe('FROM index METADATA _id');
});

test('throws if specified source is not a command', () => {
  expect(() => cmd`123`).toThrowError();
});

test('can compose expressions into commands', () => {
  const field = expr`a.b.c`;
  const cmd1 = cmd` WHERE ${field} == "asdf"`;
  const cmd2 = cmd` DISSECT ${field} """%{date}"""`;
  const text1 = BasicPrettyPrinter.command(cmd1);
  const text2 = BasicPrettyPrinter.command(cmd2);

  expect(text1).toBe('WHERE a.b.c == "asdf"');
  expect(text2).toBe('DISSECT a.b.c """%{date}"""');
});
