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

import React from 'react';
import { TimeField } from '../time_field';
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';

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
