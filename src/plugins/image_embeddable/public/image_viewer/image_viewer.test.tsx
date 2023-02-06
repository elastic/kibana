/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ImageViewer } from './image_viewer';
import { ImageViewerContext } from './image_viewer_context';
import { ImageConfig } from '../types';

const validateUrl = jest.fn(() => ({ isValid: true }));

beforeEach(() => {
  validateUrl.mockImplementation(() => ({ isValid: true }));
});

const DefaultImageViewer = (props: { imageConfig: ImageConfig }) => {
  return (
    <ImageViewerContext.Provider
      value={{
        getImageDownloadHref: (fileId: string) => `https://elastic.co/${fileId}`,
        validateUrl,
      }}
    >
      <ImageViewer imageConfig={props.imageConfig} />
    </ImageViewerContext.Provider>
  );
};

test('should display an image by a valid url', () => {
  const { getByAltText } = render(
    <DefaultImageViewer
      imageConfig={{
        src: { type: 'url', url: 'https://elastic.co/image' },
        sizing: { objectFit: 'fill' },
        altText: 'alt text',
      }}
    />
  );

  expect(getByAltText(`alt text`)).toBeVisible();
});

test('should display a 404 if url is invalid', () => {
  validateUrl.mockImplementation(() => ({ isValid: false }));
  const { queryByAltText, getByTestId } = render(
    <DefaultImageViewer
      imageConfig={{
        src: { type: 'url', url: 'https://elastic.co/image' },
        sizing: { objectFit: 'fill' },
        altText: 'alt text',
      }}
    />
  );

  expect(queryByAltText(`alt text`)).toBeNull();
  expect(getByTestId(`imageNotFound`)).toBeVisible();
});

test('should display an image by file id', () => {
  const { getByAltText } = render(
    <DefaultImageViewer
      imageConfig={{
        src: { type: 'file', fileId: 'imageId', fileImageMeta: { width: 300, height: 300 } },
        sizing: { objectFit: 'fill' },
        altText: 'alt text',
      }}
    />
  );

  expect(getByAltText(`alt text`)).toBeVisible();
  expect(getByAltText(`alt text`)).toHaveAttribute('src', 'https://elastic.co/imageId');
});
