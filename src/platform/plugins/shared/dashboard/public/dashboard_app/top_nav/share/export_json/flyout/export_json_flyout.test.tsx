/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

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

const mockDownloadFileAs = vi.fn();
const mockExportJsonFlyoutContent = vi.fn(
  ({ headerActions, headerNotice }: MockExportJsonFlyoutContentProps) => (
    <>
      {headerActions}
      {headerNotice}
    </>
  )
);

vi.mock('@kbn/as-code-export-flyout-component', () => {
      const mocked = {
      ExportJsonFlyoutContent: (props: MockExportJsonFlyoutContentProps) =>
        mockExportJsonFlyoutContent(props),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/share-plugin/public', () => {
      const mocked = {
      downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
    };
      return { ...mocked, default: mocked };
    });

describe('DashboardPanelExportJsonFlyout', () => {
  it('adapts the Dashboard panel controls and callbacks', async () => {
    const user = userEvent.setup();
    const getExportJson = vi.fn((_forceExportByValue = false) => ({ key: 'value' }));
    const warnings: NonNullable<DashboardSanitizeResponseBody['warnings']> = [
      {
        type: 'dropped_property',
        message: 'Dropped property',
        key: 'legacyProperty',
      },
    ];
    const sanitizeState = vi.fn(async (state: object) => ({
      data: state,
      warnings,
    }));

    renderWithI18n(
      <DashboardPanelExportJsonFlyout
        title="Panel"
        objectType="visualization"
        closeFlyout={vi.fn()}
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
