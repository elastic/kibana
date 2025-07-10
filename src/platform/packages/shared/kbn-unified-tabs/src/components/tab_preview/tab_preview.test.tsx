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
import type { TabItem } from '../../types';
import { getPreviewDataMock } from '../../../__mocks__/get_preview_data';

const tabItem: TabItem = {
  id: 'test-id',
  label: 'test-label',
};

const previewTestSubj = `unifiedTabs_tabPreview_${tabItem.id}`;

describe('TabPreview', () => {
  it('should call setShowPreview when mouse enters and change opacity after a delay', async () => {
    const setShowPreview = jest.fn();

    render(
      <TabPreview
        showPreview={false}
        setShowPreview={setShowPreview}
        previewData={getPreviewDataMock(tabItem)}
        tabItem={tabItem}
        stopPreviewOnHover={false}
        previewDelay={0}
      >
        <span>Tab Example</span>
      </TabPreview>
    );

    const previewContainer = screen.getByTestId(previewTestSubj);
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
        previewData={getPreviewDataMock(tabItem)}
        tabItem={tabItem}
        stopPreviewOnHover={false}
      >
        <span>Tab Example</span>
      </TabPreview>
    );

    const previewContainer = screen.getByTestId(previewTestSubj);
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
        previewData={getPreviewDataMock(tabItem)}
        tabItem={tabItem}
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
