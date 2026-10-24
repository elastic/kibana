/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';
import { ImageViewerContext } from '../image_viewer';
import type { ImageEditorFlyoutProps } from './image_editor_flyout';
import { ImageEditorFlyout } from './image_editor_flyout';
import { imageEmbeddableFileKind } from '../../imports';
import { createValidateUrl } from '../../utils/validate_url';

const validateUrl = jest.fn(() => ({ isValid: true }));

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
const SVG_DATA_URL = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';

// uses the real url validator, rather than the mock above
const validateDataUrl = createValidateUrl({
  validateUrl: (url: string) => new URL(url),
  isInternalUrl: () => false,
});

beforeEach(() => {
  validateUrl.mockImplementation(() => ({ isValid: true }));
});

const filesClient = createMockFilesClient();
filesClient.getFileKind.mockImplementation(() => imageEmbeddableFileKind);

const ImageEditor = (
  props: Partial<ImageEditorFlyoutProps> & { validateUrl?: typeof validateDataUrl }
) => {
  const { validateUrl: validateUrlOverride, ...flyoutProps } = props;
  return (
    <I18nProvider>
      <FilesContext client={filesClient}>
        <ImageViewerContext.Provider
          value={{
            getImageDownloadHref: (fileId: string) => `https://elastic.co/${fileId}`,
            validateUrl: validateUrlOverride ?? validateUrl,
          }}
        >
          <ImageEditorFlyout
            onCancel={() => {}}
            onSave={() => {}}
            {...flyoutProps}
            ariaLabelledBy="imageEditorFlyout"
          />
        </ImageViewerContext.Provider>
      </FilesContext>
    </I18nProvider>
  );
};

test('should call onCancel when "Cancel" clicked', async () => {
  const onCancel = jest.fn();
  const { getByText } = render(<ImageEditor onCancel={onCancel} />);
  expect(getByText('Cancel')).toBeVisible();
  await userEvent.click(getByText('Cancel'));
  expect(onCancel).toHaveBeenCalled();
});

test('should call onSave when "Save" clicked (url)', async () => {
  const onSave = jest.fn();
  const { getByText, getByTestId } = render(<ImageEditor onSave={onSave} />);

  await userEvent.click(getByText('Use link'));
  await userEvent.type(getByTestId(`imageEmbeddableEditorUrlInput`), `https://elastic.co/image`);
  await userEvent.type(getByTestId(`imageEmbeddableEditorAltInput`), `alt text`);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeVisible();
  await userEvent.click(getByTestId(`imageEmbeddableEditorSave`));
  expect(onSave).toHaveBeenCalledWith({
    alt_text: 'alt text',
    background_color: '',
    object_fit: 'contain',
    src: {
      type: 'url',
      url: 'https://elastic.co/image',
    },
  });
});

test('should be able to edit', async () => {
  const initialImageConfig = {
    alt_text: 'alt text',
    background_color: '',
    object_fit: 'contain' as const,
    src: {
      type: 'url' as const,
      url: 'https://elastic.co/image',
    },
  };
  const onSave = jest.fn();
  const { getByTestId } = render(
    <ImageEditor onSave={onSave} initialImageConfig={initialImageConfig} />
  );

  expect(getByTestId(`imageEmbeddableEditorUrlInput`)).toHaveValue('https://elastic.co/image');

  await userEvent.type(getByTestId(`imageEmbeddableEditorUrlInput`), `-changed`);
  await userEvent.type(getByTestId(`imageEmbeddableEditorAltInput`), ` changed`);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeVisible();
  await userEvent.click(getByTestId(`imageEmbeddableEditorSave`));
  expect(onSave).toHaveBeenCalledWith({
    alt_text: 'alt text changed',
    background_color: '',
    object_fit: 'contain',
    src: {
      type: 'url',
      url: 'https://elastic.co/image-changed',
    },
  });
});

test(`shouldn't be able to save if url is invalid`, async () => {
  const initialImageConfig = {
    alt_text: 'alt text',
    background_color: '',
    object_fit: 'contain' as const,
    src: {
      type: 'url' as const,
      url: 'https://elastic.co/image',
    },
  };

  validateUrl.mockImplementation(() => ({ isValid: false, error: 'error' }));

  const { getByTestId } = render(<ImageEditor initialImageConfig={initialImageConfig} />);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeDisabled();
});

test('should call onSave with a base64 data url', async () => {
  const onSave = jest.fn();
  const { getByText, getByTestId } = render(
    <ImageEditor onSave={onSave} validateUrl={validateDataUrl} />
  );

  await userEvent.click(getByText('Use link'));
  await userEvent.click(getByTestId(`imageEmbeddableEditorUrlInput`));
  await userEvent.paste(PNG_DATA_URL);

  await userEvent.click(getByTestId(`imageEmbeddableEditorSave`));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ src: { type: 'url', url: PNG_DATA_URL } })
  );
});

test(`shouldn't be able to save an unsupported data url`, async () => {
  const { getByText, getByTestId } = render(<ImageEditor validateUrl={validateDataUrl} />);

  await userEvent.click(getByText('Use link'));
  await userEvent.click(getByTestId(`imageEmbeddableEditorUrlInput`));
  await userEvent.paste(SVG_DATA_URL);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeDisabled();
});
