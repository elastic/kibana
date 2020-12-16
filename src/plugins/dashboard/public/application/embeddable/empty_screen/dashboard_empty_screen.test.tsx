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
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DashboardEmptyScreen, DashboardEmptyScreenProps } from './dashboard_empty_screen';
import { coreMock } from '../../../../../../core/public/mocks';

describe('DashboardEmptyScreen', () => {
  const setupMock = coreMock.createSetup();

  const defaultProps = {
    isEditMode: false,
    onLinkClick: jest.fn(),
    uiSettings: setupMock.uiSettings,
    http: setupMock.http,
  };

  function mountComponent(props?: Partial<DashboardEmptyScreenProps>) {
    const compProps = { ...defaultProps, ...props };
    return mountWithIntl(<DashboardEmptyScreen {...compProps} />);
  }

  test('renders correctly with view mode', () => {
    const component = mountComponent();
    expect(component).toMatchSnapshot();
    const enterEditModeParagraph = component.find('.dshStartScreen__panelDesc');
    expect(enterEditModeParagraph.length).toBe(1);
  });

  test('renders correctly with edit mode', () => {
    const component = mountComponent({ isEditMode: true });
    expect(component).toMatchSnapshot();
    const paragraph = component.find('.dshStartScreen__panelDesc');
    expect(paragraph.length).toBe(0);
    const emptyPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(emptyPanel.length).toBe(1);
  });

  test('renders correctly with readonly mode', () => {
    const component = mountComponent({ isReadonlyMode: true });
    expect(component).toMatchSnapshot();
    const paragraph = component.find('.dshStartScreen__panelDesc');
    expect(paragraph.length).toBe(0);
    const emptyPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(emptyPanel.length).toBe(0);
  });
});
