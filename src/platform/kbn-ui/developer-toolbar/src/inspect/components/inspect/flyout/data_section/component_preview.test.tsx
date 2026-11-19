/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import domtoimage from 'dom-to-image-more';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ComponentPreview } from './component_preview';

jest.mock('dom-to-image-more', () => ({
  toCanvas: jest.fn(),
}));

const toCanvasMock = jest.mocked(domtoimage.toCanvas);

describe('ComponentPreview', () => {
  const mockElement = document.createElement('div');

  beforeEach(() => {
    toCanvasMock.mockReset();
  });

  it('should render correctly', () => {
    toCanvasMock.mockReturnValue(new Promise(() => {}));
    renderWithI18n(<ComponentPreview element={mockElement} />);

    const previewImage = screen.getByTestId('inspectFlyoutPreviewImage');

    expect(previewImage).toBeInTheDocument();
  });

  it('should hide the preview when the capture fails', async () => {
    toCanvasMock.mockRejectedValue(new Error('SecurityError'));
    renderWithI18n(<ComponentPreview element={mockElement} />);

    await waitFor(() =>
      expect(screen.queryByTestId('inspectFlyoutPreviewImage')).not.toBeInTheDocument()
    );
  });
});
