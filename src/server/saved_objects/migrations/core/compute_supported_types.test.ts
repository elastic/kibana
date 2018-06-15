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

import _ from 'lodash';
import { computeSupportedTypes } from './compute_supported_types';

describe('computeSupportedTypes', () => {
  test('always includes the core types', () => {
    expect(
      computeSupportedTypes({ plugins: [], kibanaVersion: '8.8.8' })
    ).toEqual(['config', 'migrationVersion', 'semver', 'type', 'updated_at']);
  });

  test('includes types from both mappings and migrations', () => {
    const plugins = [
      {
        id: 'aaa',
        mappings: {
          foo: { type: 'text' },
        },
        migrations: {
          bar: { '2': _.identity },
        },
      },
      {
        id: 'bbb',
        mappings: {
          baz: { type: 'text' },
        },
        migrations: {
          bar: { '42': _.identity },
        },
      },
    ];
    expect(
      computeSupportedTypes({ plugins, kibanaVersion: '8.8.8' } as any).sort()
    ).toEqual(
      [
        'config',
        'foo',
        'bar',
        'baz',
        'migrationVersion',
        'semver',
        'type',
        'updated_at',
      ].sort()
    );
  });
});
