/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { JsonLayout } from './json_layout';
import { Layouts } from './layouts';
import { PatternLayout } from './pattern_layout';

test('`configSchema` creates correct schema for `pattern` layout.', () => {
  const layoutsSchema = Layouts.configSchema;
  const validConfigWithOptional = { kind: 'pattern' };
  expect(layoutsSchema.validate(validConfigWithOptional)).toEqual({
    highlight: undefined,
    kind: 'pattern',
    pattern: undefined,
  });

  const validConfig = {
    highlight: true,
    kind: 'pattern',
    pattern: '%message',
  };
  expect(layoutsSchema.validate(validConfig)).toEqual({
    highlight: true,
    kind: 'pattern',
    pattern: '%message',
  });

  const wrongConfig2 = { kind: 'pattern', pattern: 1 };
  expect(() => layoutsSchema.validate(wrongConfig2)).toThrow();
});

test('`createConfigSchema()` creates correct schema for `json` layout.', () => {
  const layoutsSchema = Layouts.configSchema;

  const validConfig = { kind: 'json' };
  expect(layoutsSchema.validate(validConfig)).toEqual({ kind: 'json' });
});

test('`create()` creates correct layout.', () => {
  const patternLayout = Layouts.create({
    highlight: false,
    kind: 'pattern',
    pattern: '[%date][%level][%logger] %message',
  });
  expect(patternLayout).toBeInstanceOf(PatternLayout);

  const jsonLayout = Layouts.create({ kind: 'json' });
  expect(jsonLayout).toBeInstanceOf(JsonLayout);
});
