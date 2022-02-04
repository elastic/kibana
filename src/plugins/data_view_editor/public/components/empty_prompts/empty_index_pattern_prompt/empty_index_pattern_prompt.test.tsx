/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmptyIndexPatternPrompt } from '../empty_index_pattern_prompt';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';

describe('EmptyIndexPatternPrompt', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(
      <EmptyIndexPatternPrompt
        goToCreate={() => {}}
        canSaveIndexPattern={true}
        indexPatternsIntroUrl={'http://elastic.co/'}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
