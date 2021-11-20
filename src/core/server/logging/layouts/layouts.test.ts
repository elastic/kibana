/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JsonLayout } from './json_layout';
import { Layouts } from './layouts';
import { PatternLayout } from './pattern_layout';

test('`configSchema` creates correct schema for `pattern` layout.', () => {
  const layoutsSchema = Layouts.configSchema;
  const validConfigWithOptional = { type: 'pattern' };
  expect(layoutsSchema.validate(validConfigWithOptional)).toEqual({
    highlight: undefined,
    type: 'pattern',
    pattern: undefined,
  });

  const validConfig = {
    highlight: true,
    type: 'pattern',
    pattern: '%message',
  };
  expect(layoutsSchema.validate(validConfig)).toEqual({
    highlight: true,
    type: 'pattern',
    pattern: '%message',
  });

  const wrongConfig2 = { type: 'pattern', pattern: 1 };
  expect(() => layoutsSchema.validate(wrongConfig2)).toThrow();
});

test('`createConfigSchema()` creates correct schema for `json` layout.', () => {
  const layoutsSchema = Layouts.configSchema;

  const validConfig = { type: 'json' };
  expect(layoutsSchema.validate(validConfig)).toEqual({ type: 'json' });
});

test('`create()` creates correct layout.', () => {
  const patternLayout = Layouts.create({
    highlight: false,
    type: 'pattern',
    pattern: '[%date][%level][%logger] %message',
  });
  expect(patternLayout).toBeInstanceOf(PatternLayout);

  const jsonLayout = Layouts.create({ type: 'json' });
  expect(jsonLayout).toBeInstanceOf(JsonLayout);
});
