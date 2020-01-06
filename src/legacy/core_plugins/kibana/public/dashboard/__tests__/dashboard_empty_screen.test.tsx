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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import {
  DashboardEmptyScreen,
  DashboardEmptyScreenProps,
} from '../np_ready/dashboard_empty_screen';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { coreMock } from '../../../../../../core/public/mocks';

describe('DashboardEmptyScreen', () => {
  const setupMock = coreMock.createSetup();

  const defaultProps = {
    showLinkToVisualize: true,
    onLinkClick: jest.fn(),
    uiSettings: setupMock.uiSettings,
    http: setupMock.http,
  };

  function mountComponent(props?: DashboardEmptyScreenProps) {
    const compProps = props || defaultProps;
    const comp = mountWithIntl(<DashboardEmptyScreen {...compProps} />);
    return comp;
  }

  test('renders correctly with visualize paragraph', () => {
    const component = mountComponent();
    expect(component).toMatchSnapshot();
    const paragraph = findTestSubject(component, 'linkToVisualizeParagraph');
    expect(paragraph.length).toBe(1);
  });

  test('renders correctly without visualize paragraph', () => {
    const component = mountComponent({ ...defaultProps, ...{ showLinkToVisualize: false } });
    expect(component).toMatchSnapshot();
    const paragraph = findTestSubject(component, 'linkToVisualizeParagraph');
    expect(paragraph.length).toBe(0);
  });

  test('when specified, prop onVisualizeClick is called correctly', () => {
    const onVisualizeClick = jest.fn();
    const component = mountComponent({
      ...defaultProps,
      ...{ showLinkToVisualize: true, onVisualizeClick },
    });
    const button = findTestSubject(component, 'addVisualizationButton');
    button.simulate('click');
    expect(onVisualizeClick).toHaveBeenCalled();
  });
});
