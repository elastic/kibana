/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { TimeField } from '../time_field';
import { shallowWithI18nProvider } from '@kbn/test/jest';

describe('TimeField', () => {
  it('should render normally', () => {
    const component = shallowWithI18nProvider(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render something if hiding time field', () => {
    const component = shallowWithI18nProvider(
      <TimeField
        isVisible={false}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a selected time field', () => {
    const component = shallowWithI18nProvider(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a loading state', () => {
    const component = shallowWithI18nProvider(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={true}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
