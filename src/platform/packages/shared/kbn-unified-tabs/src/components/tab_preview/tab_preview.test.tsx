/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabPreview } from './tab_preview';
import type { PreviewContentConfig } from '../../types';

const mockPreviewContent: PreviewContentConfig = {
  id: 1,
  name: 'Tab Preview',
  query: {
    language: 'esql',
    query: 'FROM logs-* | FIND ?findText | WHERE host.name == ?hostName AND log.level == ?logLevel',
  },
  status: 'success',
};

describe('TabPreview', () => {
  it('should call setShowPreview when mouse enters and change opacity after a delay', async () => {
    const setShowPreview = jest.fn();

    render(
      <TabPreview
        showPreview={false}
        setShowPreview={setShowPreview}
        previewContent={mockPreviewContent}
        stopPreviewOnHover={false}
        previewDelay={0}
      >
        <span>Tab Example</span>
      </TabPreview>
    );

    const previewContainer = screen.getByTestId(`unifiedTabs_tabPreview_${mockPreviewContent.id}`);
    expect(previewContainer).toBeInTheDocument();
    expect(previewContainer).toHaveStyle('opacity: 0');

    const tabElement = screen.getByText('Tab Example');
    fireEvent.mouseEnter(tabElement);

    await waitFor(() => {
      expect(setShowPreview).toHaveBeenCalledWith(true);
    });
  });

  it('should call setShowPreview when mouse leaves', async () => {
    const setShowPreview = jest.fn();

    render(
      <TabPreview
        showPreview={true}
        setShowPreview={setShowPreview}
        previewContent={mockPreviewContent}
        stopPreviewOnHover={false}
      >
        <span>Tab Example</span>
      </TabPreview>
    );

    const previewContainer = screen.getByTestId(`unifiedTabs_tabPreview_${mockPreviewContent.id}`);
    expect(previewContainer).toBeInTheDocument();
    expect(previewContainer).toHaveStyle('opacity: 1');

    const tabElement = screen.getByText('Tab Example');
    fireEvent.mouseLeave(tabElement);

    await waitFor(() => {
      expect(setShowPreview).toHaveBeenCalledWith(false);
    });
  });

  it('should not call setShowPreview when stopPreviewOnHover is true', async () => {
    const setShowPreview = jest.fn();

    render(
      <TabPreview
        showPreview={false}
        setShowPreview={setShowPreview}
        previewContent={mockPreviewContent}
        stopPreviewOnHover={true}
      >
        <span>Tab Example</span>
      </TabPreview>
    );

    const tabElement = screen.getByText('Tab Example');
    fireEvent.mouseEnter(tabElement);

    await waitFor(() => {
      expect(setShowPreview).not.toHaveBeenCalledWith(true);
    });
  });
});
