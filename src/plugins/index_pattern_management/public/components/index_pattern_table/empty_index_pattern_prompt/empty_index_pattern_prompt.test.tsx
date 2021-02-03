/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EmptyIndexPatternPrompt } from '../empty_index_pattern_prompt';
import { shallowWithI18nProvider } from '@kbn/test/jest';

describe('EmptyIndexPatternPrompt', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(
      <EmptyIndexPatternPrompt
        canSave
        creationOptions={[{ text: 'default', onClick: () => {} }]}
        docLinksIndexPatternIntro={'testUrl'}
        setBreadcrumbs={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
