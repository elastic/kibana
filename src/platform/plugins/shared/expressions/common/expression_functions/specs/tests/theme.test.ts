/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
        getSearchContext: () => ({}),
        getSearchSessionId: () => undefined,
        getExecutionContext: () => undefined,
        types: {},
        variables: { theme: themeProps },
        abortSignal: {},
        inspectorAdapters: {},
      } as unknown as typeof context;
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
