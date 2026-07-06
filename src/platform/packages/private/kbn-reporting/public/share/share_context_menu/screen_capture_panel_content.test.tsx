/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import * as Rx from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import React from 'react';
import { ReportingAPIClient } from '../..';
import { ScreenCapturePanelContent } from './screen_capture_panel_content';

// Capture the textToCopy prop passed to EuiCopy without executing execCommand (not available in jsdom)
let capturedTextToCopy = '';
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiCopy: ({
      textToCopy,
      children,
    }: {
      textToCopy: string;
      children: (copy: () => void) => React.ReactNode;
    }) => {
      capturedTextToCopy = textToCopy;
      return children(() => {});
    },
  };
});

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
  renderWithI18n(
    <ScreenCapturePanelContent
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      startServices$={startServices$}
    />
  );
  expect(screen.queryByText('Full page layout')).not.toBeInTheDocument();
  expect(screen.queryByText('Optimize for printing')).not.toBeInTheDocument();
});

test('ScreenCapturePanelContent properly renders a view with "canvas" layout option', () => {
  renderWithI18n(
    <ScreenCapturePanelContent
      layoutOption="canvas"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      startServices$={startServices$}
    />
  );
  expect(screen.getByText('Full page layout')).toBeInTheDocument();
});

test('ScreenCapturePanelContent allows POST URL to be copied when objectId is provided', () => {
  renderWithI18n(
    <ScreenCapturePanelContent
      layoutOption="canvas"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      objectId={'1234-5'}
      startServices$={startServices$}
    />
  );
  expect(screen.getByText('Copy POST URL')).toBeInTheDocument();
  expect(screen.queryByText('Unsaved work')).not.toBeInTheDocument();
});

test('ScreenCapturePanelContent does not allow POST URL to be copied when objectId is not provided', () => {
  renderWithI18n(
    <ScreenCapturePanelContent
      layoutOption="canvas"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      startServices$={startServices$}
    />
  );
  expect(screen.queryByText('Copy POST URL')).not.toBeInTheDocument();
  expect(screen.getByText('Unsaved work')).toBeInTheDocument();
});

test('ScreenCapturePanelContent properly renders a view with "print" layout option', () => {
  renderWithI18n(
    <ScreenCapturePanelContent
      layoutOption="print"
      reportType="Analytical App"
      requiresSavedState={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      startServices$={startServices$}
    />
  );
  expect(screen.getByText('Optimize for printing')).toBeInTheDocument();
});

test('ScreenCapturePanelContent decorated job params are visible in the POST URL', () => {
  renderWithI18n(
    <ScreenCapturePanelContent
      objectId="test"
      reportType="Analytical App"
      requiresSavedState={false}
      isDirty={false}
      apiClient={apiClient}
      getJobParams={getJobParamsDefault}
      startServices$={startServices$}
    />
  );

  expect(capturedTextToCopy).toEqual(
    'http://localhost/api/reporting/generate/Analytical%20App?jobParams=%28browserTimezone%3AAmerica%2FNew_York%2Clayout%3A%28dimensions%3A%28height%3A768%2Cwidth%3A1024%29%2Cid%3Apreserve_layout%29%2CobjectType%3Atest-object-type%2Ctitle%3A%27Test%20Report%20Title%27%2Cversion%3A%277.15.0%27%29'
  );
});
