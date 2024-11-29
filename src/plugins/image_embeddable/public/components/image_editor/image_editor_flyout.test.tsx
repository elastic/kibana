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
import { ImageEditorFlyout, ImageEditorFlyoutProps } from './image_editor_flyout';
import { imageEmbeddableFileKind } from '../../imports';

const validateUrl = jest.fn(() => ({ isValid: true }));

beforeEach(() => {
  validateUrl.mockImplementation(() => ({ isValid: true }));
});

const filesClient = createMockFilesClient();
filesClient.getFileKind.mockImplementation(() => imageEmbeddableFileKind);

const ImageEditor = (props: Partial<ImageEditorFlyoutProps>) => {
  return (
    <I18nProvider>
      <FilesContext client={filesClient}>
        <ImageViewerContext.Provider
          value={{
            getImageDownloadHref: (fileId: string) => `https://elastic.co/${fileId}`,
            validateUrl,
          }}
        >
          <ImageEditorFlyout onCancel={() => {}} onSave={() => {}} {...props} />
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
  expect(onCancel).toBeCalled();
});

test('should call onSave when "Save" clicked (url)', async () => {
  const onSave = jest.fn();
  const { getByText, getByTestId } = render(<ImageEditor onSave={onSave} />);

  await userEvent.click(getByText('Use link'));
  await userEvent.type(getByTestId(`imageEmbeddableEditorUrlInput`), `https://elastic.co/image`);
  await userEvent.type(getByTestId(`imageEmbeddableEditorAltInput`), `alt text`);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeVisible();
  await userEvent.click(getByTestId(`imageEmbeddableEditorSave`));
  expect(onSave).toBeCalledWith({
    altText: 'alt text',
    backgroundColor: '',
    sizing: {
      objectFit: 'contain',
    },
    src: {
      type: 'url',
      url: 'https://elastic.co/image',
    },
  });
});

test('should be able to edit', async () => {
  const initialImageConfig = {
    altText: 'alt text',
    backgroundColor: '',
    sizing: {
      objectFit: 'contain' as const,
    },
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
  expect(onSave).toBeCalledWith({
    altText: 'alt text changed',
    backgroundColor: '',
    sizing: {
      objectFit: 'contain',
    },
    src: {
      type: 'url',
      url: 'https://elastic.co/image-changed',
    },
  });
});

test(`shouldn't be able to save if url is invalid`, async () => {
  const initialImageConfig = {
    altText: 'alt text',
    backgroundColor: '',
    sizing: {
      objectFit: 'contain' as const,
    },
    src: {
      type: 'url' as const,
      url: 'https://elastic.co/image',
    },
  };

  validateUrl.mockImplementation(() => ({ isValid: false, error: 'error' }));

  const { getByTestId } = render(<ImageEditor initialImageConfig={initialImageConfig} />);

  expect(getByTestId(`imageEmbeddableEditorSave`)).toBeDisabled();
});
