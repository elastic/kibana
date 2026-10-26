/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { coreMock, httpServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { screen } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';
import type { ReportingPanelProps as Props } from '.';
import { ReportingPanelContent } from '.';
import { ReportingAPIClient } from '../../..';
import * as constants from './constants';

jest.mock('./constants', () => ({
  getMaxUrlLength: jest.fn(() => 9999999),
}));

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

describe('ReportingPanelContent', () => {
  const props: Partial<Props> = {
    layoutId: 'super_cool_layout_id_X',
  };
  const jobParams = {
    appState: 'very_cool_app_state_X',
    objectType: 'noice_object',
    title: 'ultimate_title',
  };
  const http = httpServiceMock.createSetupContract();
  const uiSettings = uiSettingsServiceMock.createSetupContract();
  let apiClient: ReportingAPIClient;

  beforeEach(() => {
    props.layoutId = 'super_cool_layout_id_X';
    capturedTextToCopy = '';
    uiSettings.get.mockImplementation((key: string) => {
      switch (key) {
        case 'dateFormat:tz':
          return 'America/Los_Angeles';
      }
    });
    apiClient = new ReportingAPIClient(http, uiSettings, '7.15.0-test');
  });

  const { getStartServices } = coreMock.createSetup();
  const renderComponent = (newProps: Partial<Props>) =>
    renderWithI18n(
      <ReportingPanelContent
        requiresSavedState
        isDirty={true} // We have unsaved changes
        reportType="test"
        objectId="my-object-id"
        layoutId={props.layoutId}
        getJobParams={() => jobParams}
        apiClient={apiClient}
        startServices$={Rx.from(getStartServices())}
        {...props}
        {...newProps}
      />
    );

  describe('saved state', () => {
    it('prevents generating reports when saving is required and we have unsaved changes', () => {
      renderComponent({
        requiresSavedState: true,
        isDirty: true,
        objectId: undefined,
      });
      expect(screen.getByTestId('generateReportButton')).toBeDisabled();
    });

    it('allows generating reports when saving is not required', () => {
      renderComponent({
        requiresSavedState: false,
        isDirty: true,
        objectId: undefined,
      });
      expect(screen.getByTestId('generateReportButton')).not.toBeDisabled();
    });

    it('changing the layout triggers refreshing the state with the latest job params', () => {
      const { rerender } = renderComponent({ requiresSavedState: false, isDirty: false });
      expect(capturedTextToCopy).toEqual(
        'http://localhost/api/reporting/generate/test?jobParams=%28appState%3Avery_cool_app_state_X%2CbrowserTimezone%3AAmerica%2FLos_Angeles%2CobjectType%3Anoice_object%2Ctitle%3Aultimate_title%2Cversion%3A%277.15.0-test%27%29'
      );

      jobParams.appState = 'very_NOT_cool_app_state_Y';
      rerender(
        <I18nProvider>
          <ReportingPanelContent
            requiresSavedState={false}
            isDirty={false}
            reportType="test"
            objectId="my-object-id"
            layoutId="super_cool_layout_id_Y"
            getJobParams={() => jobParams}
            apiClient={apiClient}
            startServices$={Rx.from(getStartServices())}
          />
        </I18nProvider>
      );
      expect(capturedTextToCopy).toEqual(
        'http://localhost/api/reporting/generate/test?jobParams=%28appState%3Avery_NOT_cool_app_state_Y%2CbrowserTimezone%3AAmerica%2FLos_Angeles%2CobjectType%3Anoice_object%2Ctitle%3Aultimate_title%2Cversion%3A%277.15.0-test%27%29'
      );
    });
  });

  describe('copy post URL', () => {
    it('shows the copy button without warnings', () => {
      renderComponent({ requiresSavedState: false, isDirty: false });
      expect(screen.getByTestId('shareReportingCopyURL')).toBeInTheDocument();
      expect(screen.queryByTestId('shareReportingUnsavedState')).not.toBeInTheDocument();
    });

    it('does not show the copy button when there is unsaved state', () => {
      renderComponent({ requiresSavedState: false, isDirty: true });
      expect(screen.queryByTestId('shareReportingCopyURL')).not.toBeInTheDocument();
      expect(screen.getByTestId('shareReportingUnsavedState')).toBeInTheDocument();
    });

    it('does not show the copy button when the URL is too long', () => {
      (constants.getMaxUrlLength as jest.Mock).mockReturnValue(1);
      const { rerender } = renderComponent({ requiresSavedState: false, isDirty: true });

      expect(screen.queryByTestId('shareReportingCopyURL')).not.toBeInTheDocument();
      expect(screen.getByTestId('urlTooLongTrySavingMessage')).toBeInTheDocument();
      expect(screen.queryByTestId('urlTooLongErrorMessage')).not.toBeInTheDocument();

      rerender(
        <I18nProvider>
          <ReportingPanelContent
            requiresSavedState={false}
            isDirty={false}
            reportType="test"
            objectId="my-object-id"
            layoutId={props.layoutId}
            getJobParams={() => jobParams}
            apiClient={apiClient}
            startServices$={Rx.from(getStartServices())}
          />
        </I18nProvider>
      );
      expect(screen.queryByTestId('shareReportingCopyURL')).not.toBeInTheDocument();
      expect(screen.queryByTestId('urlTooLongTrySavingMessage')).not.toBeInTheDocument();
      expect(screen.getByTestId('urlTooLongErrorMessage')).toBeInTheDocument();
    });
  });
});
