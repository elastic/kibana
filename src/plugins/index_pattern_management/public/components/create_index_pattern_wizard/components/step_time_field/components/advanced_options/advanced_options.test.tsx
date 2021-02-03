/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { AdvancedOptions } from '../advanced_options';
import { shallowWithI18nProvider } from '@kbn/test/jest';

describe('AdvancedOptions', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(
      <AdvancedOptions
        isVisible={true}
        indexPatternId={'foobar'}
        toggleAdvancedOptions={() => {}}
        onChangeIndexPatternId={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should hide if not showing', () => {
    const component = shallowWithI18nProvider(
      <AdvancedOptions
        isVisible={false}
        indexPatternId={'foobar'}
        toggleAdvancedOptions={() => {}}
        onChangeIndexPatternId={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
