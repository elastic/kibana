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

import { IndexPattern, IndexPatternsService } from '../../../../data/public';
import { popularizeField } from './popularize_field';

describe('Popularize field', () => {
  test('returns undefined if index pattern lacks id', async () => {
    const indexPattern = ({} as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({} as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });

  test('returns undefined if field not found', async () => {
    const indexPattern = ({
      fields: {
        getByName: () => {},
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({} as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });

  test('returns undefined if successful', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = ({
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({
      updateSavedObject: async () => {},
    } as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
    expect(field.count).toEqual(1);
  });

  test('hides errors', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = ({
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({
      updateSavedObject: async () => {
        throw new Error('unknown error');
      },
    } as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });
});
