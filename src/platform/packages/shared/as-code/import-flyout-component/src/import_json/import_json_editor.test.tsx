/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@kbn/code-editor-mock/jest_helper';
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { ImportJsonEditor } from './import_json_editor';
import { ImportJsonValidationError } from './import_json_validation_error';
import { useImportJsonFlyoutState } from './use_import_json_flyout_state';
import type { SanitizeImportJson } from './types';

const mockCaptureError = jest.fn();
jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: (...args: unknown[]) => mockCaptureError(...args),
  },
}));

const VALID_STATE = { type: 'lens', config: { title: 'Requests' } };

const Harness = ({
  sanitizeImportJson,
}: {
  sanitizeImportJson: SanitizeImportJson<typeof VALID_STATE>;
}) => {
  const { jsonText, inputError, isValidating, canImport, onTextChange, onFileChange } =
    useImportJsonFlyoutState({
      title: 'Add panel',
      closeFlyout: jest.fn(),
      services: {
        application: applicationServiceMock.createStartContract(),
        notifications: notificationServiceMock.createStartContract(),
      },
      sanitizeImportJson,
      createFromJson: jest.fn(),
      onImportSuccess: jest.fn(),
    });
  return (
    <I18nProvider>
      <ImportJsonEditor
        dataTestSubjPrefix="test"
        value={jsonText}
        error={inputError}
        isValidating={isValidating}
        onTextChange={onTextChange}
        onFileChange={onFileChange}
      />
      <button data-test-subj="testImportButton" disabled={!canImport}>
        Import
      </button>
    </I18nProvider>
  );
};

const getTextarea = () =>
  within(screen.getByTestId('testEditor')).getByRole('textbox') as HTMLTextAreaElement;

const paste = (text: string) => {
  fireEvent.change(getTextarea(), { target: { value: text } });
};

describe('ImportJsonEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates pasted JSON once the user stops typing', async () => {
    const sanitizeImportJson = jest.fn().mockResolvedValue({ data: VALID_STATE, warnings: [] });
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);

    paste(JSON.stringify(VALID_STATE));
    expect(sanitizeImportJson).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(sanitizeImportJson).toHaveBeenCalledWith(VALID_STATE, expect.any(AbortSignal))
    );
    await waitFor(() => expect(screen.getByTestId('testImportButton')).toBeEnabled());
  });

  it('only validates the latest text and cancels the previous validation', async () => {
    let firstSignal: AbortSignal | undefined;
    const sanitizeImportJson = jest
      .fn()
      .mockImplementationOnce((_raw: unknown, signal?: AbortSignal) => {
        firstSignal = signal;
        return new Promise(() => {});
      })
      .mockResolvedValue({ data: VALID_STATE, warnings: [] });
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);

    paste('{"first": true}');
    await waitFor(() => expect(sanitizeImportJson).toHaveBeenCalledTimes(1));

    paste(JSON.stringify(VALID_STATE));
    expect(firstSignal?.aborted).toBe(true);
    await waitFor(() => expect(sanitizeImportJson).toHaveBeenCalledTimes(2));
    expect(sanitizeImportJson).toHaveBeenLastCalledWith(VALID_STATE, expect.any(AbortSignal));
  });

  it('shows an error for text that is not valid JSON', async () => {
    const sanitizeImportJson = jest.fn();
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);

    paste('{ "type": ');

    await waitFor(() =>
      expect(screen.getByText('The text is not valid JSON.')).toBeInTheDocument()
    );
    expect(sanitizeImportJson).not.toHaveBeenCalled();
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
  });

  it('rejects pasted text larger than the import limit without validating it', () => {
    const sanitizeImportJson = jest.fn();
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);

    paste(`"${'a'.repeat(1_048_576)}"`);

    expect(screen.getByText(/The JSON is too large/)).toBeInTheDocument();
    expect(sanitizeImportJson).not.toHaveBeenCalled();
  });

  it('shows validation errors from sanitizeImportJson next to the input', async () => {
    const sanitizeImportJson = jest
      .fn()
      .mockRejectedValue(new ImportJsonValidationError('The JSON does not describe a panel.'));
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);

    paste('{"title": "Only the config"}');

    await waitFor(() =>
      expect(screen.getByText('The JSON does not describe a panel.')).toBeInTheDocument()
    );
    expect(mockCaptureError).not.toHaveBeenCalled();
    expect(screen.getByTestId('testImportButton')).toBeDisabled();
  });

  it('shows the empty prompt only while there is no JSON', () => {
    render(<Harness sanitizeImportJson={jest.fn()} />);
    expect(screen.getByTestId('testEmptyPrompt')).toHaveTextContent(
      'Paste from clipboard or upload'
    );
    expect(screen.queryByTestId('testClear')).not.toBeInTheDocument();

    paste('{');

    expect(screen.queryByTestId('testEmptyPrompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('testClear')).toBeInTheDocument();
  });

  it('hides the empty prompt while the editor has focus', async () => {
    render(<Harness sanitizeImportJson={jest.fn()} />);

    await userEvent.click(getTextarea());
    expect(screen.getByTestId('testEmptyPrompt')).toHaveStyle({ opacity: '0' });

    act(() => getTextarea().blur());
    expect(screen.getByTestId('testEmptyPrompt')).toHaveStyle({ opacity: '1' });
  });

  it('opens the file browser from the upload link', async () => {
    render(<Harness sanitizeImportJson={jest.fn()} />);
    const clickSpy = jest.spyOn(screen.getByTestId('testFileInput'), 'click');

    await userEvent.click(screen.getByTestId('testUpload'));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('loads an uploaded file into the editor and validates it right away', async () => {
    const sanitizeImportJson = jest.fn().mockResolvedValue({ data: VALID_STATE, warnings: [] });
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);
    const fileContent = JSON.stringify(VALID_STATE, null, 2);

    await userEvent.upload(
      screen.getByTestId('testFileInput'),
      new File([fileContent], 'panel.json')
    );

    await waitFor(() => expect(getTextarea().value).toBe(fileContent));
    expect(sanitizeImportJson).toHaveBeenCalledWith(VALID_STATE, expect.any(AbortSignal));
  });

  it('loads a file dropped on the editor', async () => {
    const sanitizeImportJson = jest.fn().mockResolvedValue({ data: VALID_STATE, warnings: [] });
    render(<Harness sanitizeImportJson={sanitizeImportJson} />);
    const fileContent = JSON.stringify(VALID_STATE);

    fireEvent.drop(screen.getByTestId('testEditor'), {
      dataTransfer: { types: ['Files'], files: [new File([fileContent], 'panel.json')] },
    });

    await waitFor(() => expect(getTextarea().value).toBe(fileContent));
    await waitFor(() => expect(screen.getByTestId('testImportButton')).toBeEnabled());
  });

  it('clears the JSON and its errors', async () => {
    render(<Harness sanitizeImportJson={jest.fn()} />);
    paste('not json');
    await waitFor(() =>
      expect(screen.getByText('The text is not valid JSON.')).toBeInTheDocument()
    );

    await userEvent.click(screen.getByTestId('testClear'));

    expect(getTextarea().value).toBe('');
    expect(screen.queryByText('The text is not valid JSON.')).not.toBeInTheDocument();
    expect(screen.getByTestId('testEmptyPrompt')).toBeInTheDocument();
  });
});
