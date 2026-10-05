/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { ImportJsonFlyoutContent } from './import_json_flyout_content';
import type { ImportJsonFlyoutServices } from './types';

const mockCaptureError = jest.fn();
jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: (...args: unknown[]) => mockCaptureError(...args),
  },
}));

const VALID_STATE = { title: 'My Object', panels: [] };
const VALID_FILE = new File([JSON.stringify(VALID_STATE)], 'object.json', {
  type: 'application/json',
});

const createServices = (): ImportJsonFlyoutServices => {
  const application = applicationServiceMock.createStartContract();
  application.getUrlForApp.mockReturnValue('/app/management/kibana/objects');
  return {
    application,
    notifications: notificationServiceMock.createStartContract(),
  };
};

const renderFlyout = ({
  sanitizeImportJson = jest.fn().mockResolvedValue({ data: VALID_STATE, warnings: [] }),
  createFromJson = jest.fn().mockResolvedValue({ id: 'new-id', title: 'My Object' }),
  onImportSuccess = jest.fn(),
  closeFlyout = jest.fn(),
  services = createServices(),
}: {
  sanitizeImportJson?: jest.Mock;
  createFromJson?: jest.Mock;
  onImportSuccess?: jest.Mock;
  closeFlyout?: jest.Mock;
  services?: ImportJsonFlyoutServices;
} = {}) => {
  render(
    <I18nProvider>
      <ImportJsonFlyoutContent
        title="Import object"
        titleId="import-json-title"
        closeFlyout={closeFlyout}
        dataTestSubjPrefix="test"
        services={services}
        isTechnicalPreview
        serverValidationErrorTitle="The file could not be imported."
        sanitizeImportJson={sanitizeImportJson}
        createFromJson={createFromJson}
        onImportSuccess={onImportSuccess}
      />
    </I18nProvider>
  );
  return { sanitizeImportJson, createFromJson, onImportSuccess, closeFlyout, services };
};

const pickFile = async (file: File) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    await userEvent.upload(input, file);
  });
};

describe('ImportJsonFlyoutContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the file picker and info callout with NDJSON note', () => {
    renderFlyout();
    expect(screen.getByTestId('testFilePicker')).toBeInTheDocument();
    expect(screen.getByTestId('testTechnicalPreviewBadge')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'the Saved Objects page' })).toHaveAttribute(
      'href',
      '/app/management/kibana/objects'
    );
  });

  it('shows a JSON parse error when the file is not valid JSON', async () => {
    const { sanitizeImportJson } = renderFlyout();
    await pickFile(new File(['not json }{'], 'bad.json', { type: 'application/json' }));
    await waitFor(() =>
      expect(screen.getByText(/does not contain valid JSON/)).toBeInTheDocument()
    );
    expect(sanitizeImportJson).not.toHaveBeenCalled();
  });

  it('shows a file size error without reading an oversized file', async () => {
    const { sanitizeImportJson } = renderFlyout();
    const oversized = new File(['{}'], 'big.json', { type: 'application/json' });
    const readFile = jest.fn();
    Object.defineProperty(oversized, 'size', { value: 1_048_577 });
    Object.defineProperty(oversized, 'text', { value: readFile });
    await pickFile(oversized);
    await waitFor(() => expect(screen.getByText(/maximum size is 1 MB/)).toBeInTheDocument());
    expect(readFile).not.toHaveBeenCalled();
    expect(sanitizeImportJson).not.toHaveBeenCalled();
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
  });

  it('shows the server error callout when sanitize rejects the file', async () => {
    const sanitizeImportJson = jest.fn().mockRejectedValue(new Error('invalid'));
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);
    await waitFor(() => expect(screen.getByTestId('testServerError')).toBeInTheDocument());
    expect(screen.getByText(/could not be imported/)).toBeInTheDocument();
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        labels: { error_type: 'SanitizeImportJsonFailure' },
      })
    );
  });

  it('enables Import after a valid file is chosen', async () => {
    const { sanitizeImportJson } = renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() =>
      expect(sanitizeImportJson).toHaveBeenCalledWith(VALID_STATE, expect.any(AbortSignal))
    );
    expect(screen.getByTestId('testImportButton')).toBeEnabled();
  });

  it('aborts sanitize when the file is cleared', async () => {
    let resolveSanitize:
      | ((value: { data: typeof VALID_STATE; warnings: string[] }) => void)
      | undefined;
    const sanitizeImportJson = jest.fn(
      (_raw: unknown, signal?: AbortSignal) =>
        new Promise<{ data: typeof VALID_STATE; warnings: string[] }>((resolve, reject) => {
          resolveSanitize = resolve;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);
    await waitFor(() => expect(sanitizeImportJson).toHaveBeenCalled());

    const signal = sanitizeImportJson.mock.calls[0][1] as AbortSignal;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      await userEvent.upload(input, []);
    });

    expect(signal.aborted).toBe(true);
    expect(screen.queryByTestId('testServerError')).not.toBeInTheDocument();
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
    expect(mockCaptureError).not.toHaveBeenCalled();
    // Ensure a late resolve from the aborted request cannot enable import
    await act(async () => {
      resolveSanitize?.({ data: VALID_STATE, warnings: [] });
    });
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
  });

  it('aborts sanitize when the flyout unmounts', async () => {
    const sanitizeImportJson = jest.fn(
      (_raw: unknown, signal?: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );
    const { unmount } = render(
      <I18nProvider>
        <ImportJsonFlyoutContent
          title="Import object"
          titleId="import-json-title"
          closeFlyout={jest.fn()}
          dataTestSubjPrefix="test"
          services={createServices()}
          isTechnicalPreview
          serverValidationErrorTitle="The file could not be imported."
          sanitizeImportJson={sanitizeImportJson}
          createFromJson={jest.fn()}
          onImportSuccess={jest.fn()}
        />
      </I18nProvider>
    );
    await pickFile(VALID_FILE);
    await waitFor(() => expect(sanitizeImportJson).toHaveBeenCalled());

    const signal = sanitizeImportJson.mock.calls[0][1] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('shows collapsible warnings above the file picker but still allows import', async () => {
    const user = userEvent.setup();
    const sanitizeImportJson = jest.fn().mockResolvedValue({
      data: VALID_STATE,
      warnings: ['Panel "chart-1" could not be loaded'],
    });
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);
    await waitFor(() => expect(screen.getByTestId('testWarnings')).toBeInTheDocument());
    expect(screen.getByText(/Unsupported properties were removed/)).toBeInTheDocument();
    expect(screen.getByText(/1 item removed from the imported file/)).toBeInTheDocument();
    expect(screen.queryByTestId('testWarningsList')).not.toBeInTheDocument();

    await user.click(screen.getByText('Show details'));
    expect(screen.getAllByTestId('testWarningsList')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Panel "chart-1" could not be loaded/)[0]).toBeInTheDocument();

    const warnings = screen.getByTestId('testWarnings');
    const filePicker = screen.getByTestId('testFilePicker');
    const position = warnings.compareDocumentPosition(filePicker);
    expect(Math.floor(position / Node.DOCUMENT_POSITION_FOLLOWING) % 2).toBe(1);
    expect(screen.getByTestId('testImportButton')).toBeEnabled();
  });

  it('shows potentially unavailable related items but still allows import', async () => {
    const user = userEvent.setup();
    const sanitizeImportJson = jest.fn().mockResolvedValue({
      data: VALID_STATE,
      warnings: [],
      relatedItems: [
        { type: 'index-pattern', type_label: 'data view', id: 'data-view-1' },
        { type: 'lens', type_label: 'lens', id: 'library-item-1' },
      ],
      relatedItemsCount: 123,
    });
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);

    await waitFor(() => expect(screen.getByTestId('testWarnings')).toBeInTheDocument());
    expect(screen.getByText('Review import warnings')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This import references 123 related items. Make sure that these items exist in this cluster or space/
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Showing the first 2.')).toBeInTheDocument();
    expect(screen.queryByTestId('testRelatedItemsList')).not.toBeInTheDocument();

    await user.click(within(screen.getByTestId('testRelatedItemsAccordion')).getByRole('button'));
    expect(screen.getAllByTestId('testRelatedItemsList')[0]).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Item type' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Item ID' })[0]).toBeInTheDocument();
    expect(screen.getAllByText('data view')[0]).toBeInTheDocument();
    expect(screen.getAllByText('data-view-1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('lens')[0]).toBeInTheDocument();
    expect(screen.getAllByText('library-item-1')[0]).toBeInTheDocument();
    expect(screen.getByTestId('testImportButton')).toBeEnabled();
  });

  it('shows sanitize warnings and related items as separate sections in one callout', async () => {
    const user = userEvent.setup();
    const sanitizeImportJson = jest.fn().mockResolvedValue({
      data: VALID_STATE,
      warnings: ['Panel "chart-1" could not be loaded'],
      relatedItems: [{ type: 'index-pattern', type_label: 'index-pattern', id: 'data-view-1' }],
    });
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);

    await waitFor(() => expect(screen.getByTestId('testWarnings')).toBeInTheDocument());
    expect(screen.getAllByTestId('testWarnings')).toHaveLength(1);
    expect(screen.getByText(/1 item removed from the imported file/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /This import references 1 related item. Make sure that these items exist in this cluster or space/
      )
    ).toBeInTheDocument();

    const warningsAccordion = screen.getByTestId('testWarningsAccordion');
    const relatedItemsAccordion = screen.getByTestId('testRelatedItemsAccordion');
    await user.click(within(warningsAccordion).getByRole('button'));
    await user.click(within(relatedItemsAccordion).getByRole('button'));
    expect(screen.getAllByText(/Panel "chart-1" could not be loaded/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('index-pattern')[0]).toBeInTheDocument();
    expect(screen.getAllByText('data-view-1')[0]).toBeInTheDocument();
    expect(screen.getByTestId('testImportButton')).toBeEnabled();
  });

  it('resets a dismissed warning callout when another file is selected', async () => {
    const user = userEvent.setup();
    const sanitizeImportJson = jest
      .fn()
      .mockResolvedValueOnce({
        data: VALID_STATE,
        warnings: [],
        relatedItems: [{ type: 'index-pattern', type_label: 'index-pattern', id: 'data-view-1' }],
      })
      .mockResolvedValueOnce({
        data: VALID_STATE,
        warnings: ['A property was removed'],
        relatedItems: [],
      });
    renderFlyout({ sanitizeImportJson });
    await pickFile(VALID_FILE);
    await waitFor(() => expect(screen.getByTestId('testWarnings')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('testWarnings')).not.toBeInTheDocument();

    await pickFile(new File([JSON.stringify(VALID_STATE)], 'another-object.json'));
    await waitFor(() => expect(sanitizeImportJson).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('testWarnings')).toBeInTheDocument();
    await user.click(within(screen.getByTestId('testWarningsAccordion')).getByRole('button'));
    expect(screen.getAllByText('A property was removed')[0]).toBeInTheDocument();
  });

  it('creates the object and calls onImportSuccess', async () => {
    const { createFromJson, onImportSuccess, closeFlyout } = renderFlyout();
    await pickFile(VALID_FILE);
    await waitFor(() => expect(screen.getByTestId('testImportButton')).toBeEnabled());
    await act(async () => {
      await userEvent.click(screen.getByTestId('testImportButton'));
    });
    await waitFor(() => expect(createFromJson).toHaveBeenCalledWith(VALID_STATE));
    expect(onImportSuccess).toHaveBeenCalledWith('new-id', 'My Object');
    expect(closeFlyout).toHaveBeenCalled();
  });

  it('shows a danger toast when createFromJson fails', async () => {
    const createFromJson = jest.fn().mockRejectedValue(new Error('create failed'));
    const { services } = renderFlyout({ createFromJson });
    await pickFile(VALID_FILE);
    await waitFor(() => expect(screen.getByTestId('testImportButton')).toBeEnabled());
    await act(async () => {
      await userEvent.click(screen.getByTestId('testImportButton'));
    });
    await waitFor(() =>
      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Import object',
        text: 'create failed',
      })
    );
  });
});
