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
import { mount, shallow } from 'enzyme';
import * as React from 'react';
import { intlShape } from 'react-intl';

import { injectI18n } from './inject';
import { injectI18nProvider } from './inject_i18n_provider';

describe('injectI18nProvider', () => {
  test('renders children', () => {
    const ChildrenMock = () => null;
    const Injected = injectI18nProvider(ChildrenMock);

    expect(shallow(<Injected />)).toMatchSnapshot();
  });

  test('provides with context', () => {
    const ChildrenMock = () => <div />;
    const WithIntl = injectI18n(ChildrenMock);
    const Injected = injectI18nProvider(WithIntl);

    const wrapper = mount(<Injected />, {
      childContextTypes: {
        intl: intlShape,
      },
    });

    expect(wrapper.find(ChildrenMock).prop('intl')).toMatchSnapshot();
  });
});
