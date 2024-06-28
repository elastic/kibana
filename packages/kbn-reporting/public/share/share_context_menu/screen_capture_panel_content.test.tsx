/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mount } from 'enzyme';
import React from 'react';
import { ReportingAPIClient } from '../..';
import { ScreenCapturePanelContent } from './screen_capture_panel_content';

const { http, uiSettings, getStartServices } = coreMock.createSetup();
const startServices$ = Rx.from(getStartServices());
uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case 'dateFormat:tz':
      return 'Mars';
  }
});
const apiClient = new ReportingAPIClient(http, uiSettings, '7.15.0');

const getJobParamsDefault = () => ({
  objectType: 'test-object-type',
  title: 'Test Report Title',
  browserTimezone: 'America/New_York',
});

test('ScreenCapturePanelContent renders the default view properly', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        startServices$={startServices$}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm').render()).toMatchSnapshot();
  expect(component.text()).not.toMatch('Full page layout');
  expect(component.text()).not.toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent properly renders a view with "canvas" layout option', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        startServices$={startServices$}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm').render()).toMatchSnapshot();
  expect(component.text()).toMatch('Full page layout');
});

test('ScreenCapturePanelContent allows POST URL to be copied when objectId is provided', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        objectId={'1234-5'}
        startServices$={startServices$}
      />
    </IntlProvider>
  );
  expect(component.text()).toMatch('Copy POST URL');
  expect(component.text()).not.toMatch('Unsaved work');
});

test('ScreenCapturePanelContent does not allow POST URL to be copied when objectId is not provided', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="canvas"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        startServices$={startServices$}
      />
    </IntlProvider>
  );
  expect(component.text()).not.toMatch('Copy POST URL');
  expect(component.text()).toMatch('Unsaved work');
});

test('ScreenCapturePanelContent properly renders a view with "print" layout option', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        layoutOption="print"
        reportType="Analytical App"
        requiresSavedState={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        startServices$={startServices$}
      />
    </IntlProvider>
  );
  expect(component.find('EuiForm').render()).toMatchSnapshot();
  expect(component.text()).toMatch('Optimize for printing');
});

test('ScreenCapturePanelContent decorated job params are visible in the POST URL', () => {
  const component = mount(
    <IntlProvider locale="en">
      <ScreenCapturePanelContent
        objectId="test"
        reportType="Analytical App"
        requiresSavedState={false}
        isDirty={false}
        apiClient={apiClient}
        getJobParams={getJobParamsDefault}
        startServices$={startServices$}
      />
    </IntlProvider>
  );

  expect(component.find('EuiCopy').prop('textToCopy')).toMatchInlineSnapshot(
    `"http://localhost/api/reporting/generate/Analytical%20App?jobParams=%28browserTimezone%3AAmerica%2FNew_York%2Clayout%3A%28dimensions%3A%28height%3A768%2Cwidth%3A1024%29%2Cid%3Apreserve_layout%29%2CobjectType%3Atest-object-type%2Ctitle%3A%27Test%20Report%20Title%27%2Cversion%3A%277.15.0%27%29"`
  );
});
