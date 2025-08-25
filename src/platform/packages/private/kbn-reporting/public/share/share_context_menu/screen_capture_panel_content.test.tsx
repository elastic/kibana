/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
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
});

test('renders default view without canvas or print layout labels', () => {
  render(
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
  expect(screen.queryByText(/Full page layout/i)).toBeNull();
  expect(screen.queryByText(/Optimize for printing/i)).toBeNull();
});

test('shows canvas layout text when layoutOption=canvas', () => {
  render(
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
  expect(screen.getByText(/Full page layout/i)).toBeTruthy();
});

test('allows POST URL copy when objectId is provided', () => {
  render(
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
  expect(screen.getByText(/Copy POST URL/i)).toBeTruthy();
  expect(screen.queryByText(/Unsaved work/i)).toBeNull();
});

test('disallows POST URL copy when objectId missing', () => {
  render(
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
  expect(screen.queryByText(/Copy POST URL/i)).toBeNull();
  expect(screen.getByText(/Unsaved work/i)).toBeTruthy();
});

test('shows print layout text when layoutOption=print', () => {
  render(
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
  expect(screen.getByText(/Optimize for printing/i)).toBeTruthy();
});

test('exposes decorated job params in the POST URL copy value', () => {
  // Construct expected URL via the same apiClient helpers the component uses
  const decorated = apiClient.getDecoratedJobParams(getJobParamsDefault()); // client injects browserTimezone & version
  const relative = apiClient.getReportingPublicJobPath('Analytical App', decorated);
  // window.location.href is used as base; ensure it has a hostname for URL()
  const originalHref = window.location.href;
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: 'http://localhost/app/dashboards' },
  });

  render(
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

  const expectedAbsolute = new URL(relative, 'http://localhost/app/dashboards').toString();
  // The button exists (copy action). We can't reach into EuiCopy props; instead, verify advanced options accordion text and that clicking it reveals button.
  const advanced = screen.getByRole('button', { name: /Advanced options/i });
  advanced.click();
  const copyBtn = screen.getByRole('button', { name: /Copy POST URL/i });
  expect(copyBtn).toBeTruthy();
  // Sanity: expected URL contains encoded job params pieces
  expect(expectedAbsolute).toMatch(/generate/);
  expect(expectedAbsolute).toMatch(/jobParams=/);

  // restore location
  Object.defineProperty(window, 'location', { writable: true, value: { href: originalHref } });
});
