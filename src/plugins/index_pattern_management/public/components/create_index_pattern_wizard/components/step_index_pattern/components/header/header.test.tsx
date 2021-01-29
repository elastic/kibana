/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { Header } from '../header';
import { shallowWithI18nProvider } from '@kbn/test/jest';

describe('Header', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(
      <Header
        isInputInvalid={false}
        errors={[]}
        characterList={'%'}
        query={'k'}
        onQueryChanged={() => {}}
        goToNextStep={() => {}}
        isNextStepDisabled={false}
        onChangeIncludingSystemIndices={() => {}}
        isIncludingSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should mark the input as invalid', () => {
    const component = shallowWithI18nProvider(
      <Header
        isInputInvalid={true}
        errors={['Input is invalid']}
        characterList={'%'}
        query={'%'}
        onQueryChanged={() => {}}
        goToNextStep={() => {}}
        isNextStepDisabled={true}
        onChangeIncludingSystemIndices={() => {}}
        isIncludingSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
