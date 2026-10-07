/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PAGINATION_MODE } from '@kbn/unified-data-table';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { DataSourceCategory } from '../../../../profiles';
import { getPaginationConfig } from './get_pagination_config';

const params = {
  context: { category: DataSourceCategory.Logs },
  toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
};

describe('getPaginationConfig (logs)', () => {
  it('enforces singlePage over the mode a preceding profile set', () => {
    // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
    const result = getPaginationConfig!(
      () => ({ paginationMode: DEFAULT_PAGINATION_MODE }),
      params
    )();

    expect(result.paginationMode).toBe('singlePage');
  });
});
