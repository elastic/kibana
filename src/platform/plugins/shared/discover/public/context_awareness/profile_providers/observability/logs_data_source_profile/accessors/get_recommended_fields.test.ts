/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_LOGS_PROFILE } from '@kbn/discover-utils';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { createRecommendedFields } from './get_recommended_fields';

const params = {
  context: {} as never,
  toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
};

// `createRecommendedFields` ignores `prev`, so the stub's contents don't matter.
const noPrev = () => ({ recommendedFields: [] });

describe('createRecommendedFields (logs)', () => {
  it('returns the DEFAULT_LOGS_PROFILE field list when no defaultFields override is supplied', () => {
    const result = createRecommendedFields({})!(noPrev, params)();

    expect(result.recommendedFields).toEqual([...DEFAULT_LOGS_PROFILE.recommendedFields]);
  });

  it('returns the supplied defaultFields when a defaultFields override is provided', () => {
    const overrideFields = ['log.level', 'service.name', 'host.name'];
    const result = createRecommendedFields({ defaultFields: overrideFields })!(noPrev, params)();

    expect(result.recommendedFields).toEqual(overrideFields);
  });
});
