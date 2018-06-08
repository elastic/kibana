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
import { getActiveMappings } from './mappings';

describe('getActiveMappings', () => {
  test('combines all mappings and includes core mappings', () => {
    const plugins = [
      {
        id: 'pluginA',
        mappings: {
          aaa: { type: 'text' },
        },
      },
      {
        id: 'pluginB',
        mappings: {
          bbb: { type: 'long' },
        },
      },
    ];

    expect(getActiveMappings(plugins)).toMatchSnapshot();
  });

  test('disallows duplicate mappings', () => {
    const plugins = [
      {
        id: 'hello',
        mappings: { stuff: 'goes here' },
      },
      {
        id: 'cartoons',
        mappings: {
          bugs: { type: 'bunny' },
          stuff: { type: 'shazm' },
        },
      },
    ];

    expect(() => getActiveMappings(plugins)).toThrow(
      /Plugin \"(hello|cartoons)\" is attempting to redefine mapping \"stuff\"/
    );
  });

  test('disallows mappings with leading underscore', () => {
    const plugins = [
      {
        id: 'nadachance',
        mappings: { _hm: 'You shall not pass!' },
      },
    ];

    expect(() => getActiveMappings(plugins)).toThrow(
      /Invalid mapping \"_hm\" in plugin \"nadachance\"\. Mappings cannot start with _/
    );
  });
});
