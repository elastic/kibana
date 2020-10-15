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

import { functionWrapper } from './utils';
import { theme } from '../theme';
import { ExecutionContext } from '../../../execution/types';

describe('expression_functions', () => {
  describe('theme', () => {
    const fn = functionWrapper(theme);
    let context: ExecutionContext;

    let themeProps;

    beforeEach(() => {
      themeProps = {
        font: {
          family: 'Arial',
          size: 14,
        },
      };

      context = {
        getSearchContext: () => ({} as any),
        getSearchSessionId: () => undefined,
        types: {},
        variables: { theme: themeProps },
        abortSignal: {} as any,
        inspectorAdapters: {} as any,
      };
    });

    it('returns the selected variable', () => {
      const actual = fn(null, { variable: 'font.family' }, context);
      expect(actual).toEqual('Arial');
    });

    it('returns undefined if variable does not exist', () => {
      const actual = fn(null, { variable: 'font.weight' }, context);
      expect(actual).toEqual(undefined);
    });

    it('returns default if variable does not exist and default is provided', () => {
      const actual = fn(null, { variable: 'font.weight', default: 'normal' }, context);
      expect(actual).toEqual('normal');
    });
  });
});
