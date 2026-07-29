/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { DashboardSanitizeResponseBody } from '../../../../../../server';
import { DashboardPanelExportJsonFlyout } from './export_json_flyout';

interface MockExportJsonFlyoutContentProps {
  downloadExportJson: (filename: string, content: string) => Promise<void> | void;
  getExportJson: () => object;
  headerActions?: ReactNode;
  headerNotice?: ReactNode;
  prepareExportJson: (state: object) => Promise<{
    data: object | undefined;
    warnings: readonly string[];
  }>;
}

const mockDownloadFileAs = jest.fn();
const mockExportJsonFlyoutContent = jest.fn(
  ({ headerActions, headerNotice }: MockExportJsonFlyoutContentProps) => (
    <>
      {headerActions}
      {headerNotice}
    </>
  )
);

jest.mock('@kbn/as-code-json-flyout-component', () => ({
  ExportJsonFlyoutContent: (props: MockExportJsonFlyoutContentProps) =>
    mockExportJsonFlyoutContent(props),
}));

jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
}));

describe('DashboardPanelExportJsonFlyout', () => {
  it('adapts the Dashboard panel controls and callbacks', async () => {
    const user = userEvent.setup();
    const getExportJson = jest.fn((_forceExportByValue = false) => ({ key: 'value' }));
    const warnings: NonNullable<DashboardSanitizeResponseBody['warnings']> = [
      {
        type: 'dropped_property',
        message: 'Dropped property',
        key: 'legacyProperty',
      },
    ];
    const sanitizeState = jest.fn(async (state: object) => ({
      data: state,
      warnings,
    }));

    renderWithI18n(
      <DashboardPanelExportJsonFlyout
        title="Panel"
        objectType="visualization"
        closeFlyout={jest.fn()}
        getExportJson={getExportJson}
        isByReference
        sanitizeState={sanitizeState}
        titleId="dashboardPanelExportJsonTitle"
      />
    );

    const getLatestSharedProps = () =>
      mockExportJsonFlyoutContent.mock.calls[mockExportJsonFlyoutContent.mock.calls.length - 1][0];

    getLatestSharedProps().getExportJson();
    expect(getExportJson).toHaveBeenLastCalledWith(false);
    expect(screen.getByText(/This panel is linked to the library/)).toBeInTheDocument();

    await user.click(screen.getByRole('switch'));

    getLatestSharedProps().getExportJson();
    expect(getExportJson).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText(/This panel is linked to the library/)).not.toBeInTheDocument();

    await expect(getLatestSharedProps().prepareExportJson({ key: 'value' })).resolves.toEqual({
      data: { key: 'value' },
      warnings: ['Dropped property'],
    });

    await getLatestSharedProps().downloadExportJson('panel.json', '{}');
    expect(mockDownloadFileAs).toHaveBeenCalledWith('panel.json', {
      content: '{}',
      type: 'application/json',
    });
  });
});
