/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import '@kbn/code-editor-mock/jest_helper';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ExportJsonFlyoutContent } from './export_json_flyout_content';

describe('ExportJsonFlyoutContent', () => {
  it('renders consumer-provided header content and gets the current state without arguments', async () => {
    const getExportJson = jest.fn(() => ({ title: 'My object' }));

    renderWithI18n(
      <ExportJsonFlyoutContent
        title="My object"
        objectType="Object"
        closeFlyout={jest.fn()}
        dataTestSubjPrefix="test"
        downloadExportJson={jest.fn()}
        getExportJson={getExportJson}
        headerActions={<div data-test-subj="headerAction" />}
        headerNotice={<div data-test-subj="headerNotice" />}
        isTechnicalPreview
        titleId="exportJsonTitle"
      />
    );

    expect(getExportJson).toHaveBeenCalledWith();
    expect(screen.getByRole('heading', { name: 'Export object as JSON' })).toHaveAttribute(
      'id',
      'exportJsonTitle'
    );
    expect(screen.getByTestId('testExportJsonTechnicalPreviewBadge')).toBeInTheDocument();
    expect(screen.getByTestId('headerAction')).toBeInTheDocument();
    expect(screen.getByTestId('headerNotice')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download JSON' })).toBeEnabled()
    );
  });

  it('does not render the Technical Preview badge when the consumer disables it', async () => {
    renderWithI18n(
      <ExportJsonFlyoutContent
        title="My object"
        objectType="Object"
        closeFlyout={jest.fn()}
        dataTestSubjPrefix="test"
        downloadExportJson={jest.fn()}
        getExportJson={() => ({ title: 'My object' })}
        isTechnicalPreview={false}
      />
    );

    expect(screen.queryByTestId('testExportJsonTechnicalPreviewBadge')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download JSON' })).toBeEnabled()
    );
  });

  it('waits for the download before closing the flyout', async () => {
    const user = userEvent.setup();
    let resolveDownload: () => void = () => {};
    const downloadPromise = new Promise<void>((resolve) => {
      resolveDownload = resolve;
    });
    const downloadExportJson = jest.fn(() => downloadPromise);
    const closeFlyout = jest.fn();

    renderWithI18n(
      <ExportJsonFlyoutContent
        title="My/object"
        objectType="Object"
        closeFlyout={closeFlyout}
        dataTestSubjPrefix="test"
        downloadExportJson={downloadExportJson}
        getExportJson={() => ({ title: 'My/object' })}
        isTechnicalPreview
      />
    );

    const downloadButton = screen.getByRole('button', { name: 'Download JSON' });
    await waitFor(() => expect(downloadButton).toBeEnabled());
    await user.click(downloadButton);

    expect(downloadExportJson).toHaveBeenCalledWith(
      'My_object.json',
      '{\n  "title": "My/object"\n}'
    );
    expect(closeFlyout).not.toHaveBeenCalled();

    resolveDownload();
    await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
  });
});
