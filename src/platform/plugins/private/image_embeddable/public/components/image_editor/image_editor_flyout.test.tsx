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
import { BehaviorSubject } from 'rxjs';

jest.mock('@kbn/embeddable-plugin/public', () => ({
  ...jest.requireActual('@kbn/embeddable-plugin/public'),
  // stub of the lazy loaded sections, lets the tests change the panel title
  PanelSettingsFlyoutSections: ({
    updateState,
  }: {
    updateState: (update: { title: string }) => void;
  }) => (
    <button data-test-subj="panelSettingsStub" onClick={() => updateState({ title: 'New title' })}>
      change title
    </button>
  ),
}));

const createPanelSettingsApi = () => ({
  title$: new BehaviorSubject<string | undefined>('Old title'),
  hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
  description$: new BehaviorSubject<string | undefined>(undefined),
  hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
  setTitle: jest.fn(),
  setHideTitle: jest.fn(),
  setDescription: jest.fn(),
  setHideBorder: jest.fn(),
});

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
          <ImageEditorFlyout
            onCancel={() => {}}
            onSave={() => {}}
            {...props}
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

test('should apply the panel settings on save when editing a panel', async () => {
  const onSave = jest.fn();
  const panelSettingsApi = createPanelSettingsApi();
  const { getByTestId } = render(
    <ImageEditor
      onSave={onSave}
      panelSettingsApi={panelSettingsApi}
      initialImageConfig={{
        src: { type: 'url', url: 'https://elastic.co/image' },
        object_fit: 'contain',
        alt_text: 'alt text',
      }}
    />
  );
  await userEvent.click(getByTestId('panelSettingsStub'));
  await userEvent.click(getByTestId('imageEmbeddableEditorSave'));
  expect(panelSettingsApi.setTitle).toHaveBeenCalledWith('New title');
  expect(onSave).toHaveBeenCalled();
});

test('should not show the panel settings when creating an image', () => {
  const { queryByTestId } = render(<ImageEditor />);
  expect(queryByTestId('panelSettingsStub')).not.toBeInTheDocument();
});
