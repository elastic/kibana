/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tab } from './tab';
import { MAX_TAB_WIDTH, MIN_TAB_WIDTH } from '../../constants';
import { servicesMock } from '../../../__mocks__/services';
import { getPreviewDataMock } from '../../../__mocks__/get_preview_data';

const tabItem = {
  id: 'test-id',
  label: 'test-label',
};

const tabContentId = 'test-content-id';
const tabButtonTestSubj = `unifiedTabs_selectTabBtn_${tabItem.id}`;

const tabsSizeConfig = {
  isScrollable: false,
  regularTabMaxWidth: MAX_TAB_WIDTH,
  regularTabMinWidth: MIN_TAB_WIDTH,
};

describe('Tab', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders tab', async () => {
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    const tabButton = screen.getByTestId(tabButtonTestSubj);
    expect(tabButton).toBeInTheDocument();
    expect(tabButton).toHaveTextContent(tabItem.label);

    const tab = screen.getByRole('tab');
    expect(tab).toHaveAttribute('id', `tab-${tabItem.id}`);
    expect(tab).toHaveAttribute('aria-controls', tabContentId);
    tab.click();
    expect(onSelect).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    tabButton.click();
    expect(onSelect).toHaveBeenCalledTimes(2);

    const closeButton = screen.getByTestId(`unifiedTabs_closeTabBtn_${tabItem.id}`);
    closeButton.click();
    expect(onClose).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('can render tab menu items', async () => {
    const mockClick = jest.fn();
    const getTabMenuItems = jest.fn(() => [
      {
        'data-test-subj': 'test-subj',
        name: 'test-name',
        label: 'test-label',
        onClick: mockClick,
      },
    ]);

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getTabMenuItems={getTabMenuItems}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={jest.fn()}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const tabMenuButton = screen.getByTestId(`unifiedTabs_tabMenuBtn_${tabItem.id}`);
    act(() => {
      tabMenuButton.click();
    });

    expect(getTabMenuItems).toHaveBeenCalledWith(tabItem);

    const menuItem = screen.getByTestId('test-subj');
    menuItem.click();
    await waitFor(() => {
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
    expect(getTabMenuItems).toHaveBeenCalledTimes(1);
  });

  it('can edit tab label', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    expect(screen.queryByText(tabItem.label)).toBeInTheDocument();
    await user.dblClick(screen.getByTestId(tabButtonTestSubj));
    expect(screen.queryByText(tabItem.label)).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new-label');
    expect(input).toHaveValue('new-label');
    await user.keyboard('{enter}');
    expect(onLabelEdited).toHaveBeenCalledWith(tabItem, 'new-label');

    expect(screen.queryByTestId(tabButtonTestSubj)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('can cancel editing of tab label', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    expect(screen.queryByText(tabItem.label)).toBeInTheDocument();
    await user.dblClick(screen.getByTestId(tabButtonTestSubj));
    expect(screen.queryByText(tabItem.label)).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new-label');
    expect(input).toHaveValue('new-label');
    await user.keyboard('{escape}');

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId(tabButtonTestSubj)).toHaveFocus();
      expect(onLabelEdited).not.toHaveBeenCalled();
    });
  });

  it('can finish editing of tab label on blur', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    expect(screen.queryByText(tabItem.label)).toBeInTheDocument();
    await user.dblClick(screen.getByTestId(tabButtonTestSubj));
    expect(screen.queryByText(tabItem.label)).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'label2   ');
    expect(input).toHaveValue('label2   ');
    await user.keyboard('{tab}');
    expect(onLabelEdited).toHaveBeenCalledWith(tabItem, 'label2');

    expect(screen.queryByTestId(tabButtonTestSubj)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not trigger inline editing when disableInlineLabelEditing is true', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
        disableInlineLabelEditing={true}
      />
    );

    expect(screen.queryByText(tabItem.label)).toBeInTheDocument();
    await user.dblClick(screen.getByTestId(tabButtonTestSubj));

    // Verify that double click did not trigger inline editing
    expect(screen.queryByText(tabItem.label)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onLabelEdited).not.toHaveBeenCalled();
  });

  it('shows preview when getPreviewData is set', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    const tabButton = screen.getByTestId(tabButtonTestSubj);

    // Hover over the tab to trigger preview
    await user.hover(tabButton);

    // Fast-forward the preview delay (default is 1250ms)
    act(() => {
      jest.advanceTimersByTime(1250);
    });

    await waitFor(() => {
      const tabWithBackground = screen.getByTestId(`unifiedTabs_tab_${tabItem.id}`);
      expect(tabWithBackground).toBeInTheDocument();
      const preview = screen.getByTestId(`unifiedTabs_tabPreviewCodeBlock_${tabItem.id}`);
      expect(preview).toBeInTheDocument();
    });
  });

  it('does not show preview when getPreviewData is not set', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    const tabButton = screen.getByTestId(tabButtonTestSubj);

    // Hover over the tab - preview should not be shown
    await user.hover(tabButton);

    // Fast-forward the preview delay (default is 1250ms)
    act(() => {
      jest.advanceTimersByTime(1250);
    });

    await waitFor(() => {
      const tabWithBackground = screen.getByTestId(`unifiedTabs_tab_${tabItem.id}`);
      expect(tabWithBackground).toBeInTheDocument();
      const preview = screen.queryByTestId(`unifiedTabs_tabPreviewCodeBlock_${tabItem.id}`);
      expect(preview).not.toBeInTheDocument();
    });
  });

  it('shows close button when disableCloseButton is false', () => {
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
        disableCloseButton={false}
      />
    );

    const closeButton = screen.getByTestId(`unifiedTabs_closeTabBtn_${tabItem.id}`);
    expect(closeButton).toBeInTheDocument();
  });

  it('does not show close button when disableCloseButton is true', () => {
    const onLabelEdited = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onClose={onClose}
        disableCloseButton={true}
      />
    );

    const closeButton = screen.queryByTestId(`unifiedTabs_closeTabBtn_${tabItem.id}`);
    expect(closeButton).not.toBeInTheDocument();
  });

  it('renders default menu button when customMenuButton is not provided', () => {
    const getTabMenuItems = jest.fn(() => [
      {
        'data-test-subj': 'test-menu-item',
        name: 'test-item',
        label: 'Test Item',
        onClick: jest.fn(),
      },
    ]);

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItem}
        isSelected={false}
        services={servicesMock}
        getTabMenuItems={getTabMenuItems}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={jest.fn()}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Default menu button should be present
    const defaultMenuButton = screen.getByTestId(`unifiedTabs_tabMenuBtn_${tabItem.id}`);
    expect(defaultMenuButton).toBeInTheDocument();
  });

  it('renders custom menu button when customMenuButton is provided', () => {
    const customButton = <button data-test-subj="custom-menu-button">Custom Menu</button>;
    const tabItemWithCustomButton = {
      ...tabItem,
      customMenuButton: customButton,
    };
    const getTabMenuItems = jest.fn(() => [
      {
        'data-test-subj': 'test-menu-item',
        name: 'test-item',
        label: 'Test Item',
        onClick: jest.fn(),
      },
    ]);

    render(
      <Tab
        tabContentId={tabContentId}
        tabsSizeConfig={tabsSizeConfig}
        item={tabItemWithCustomButton}
        isSelected={false}
        services={servicesMock}
        getTabMenuItems={getTabMenuItems}
        getPreviewData={getPreviewDataMock}
        onLabelEdited={jest.fn()}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Custom menu button should be present
    const customMenuButton = screen.getByTestId('custom-menu-button');
    expect(customMenuButton).toBeInTheDocument();
    expect(customMenuButton).toHaveTextContent('Custom Menu');

    // Default menu button should NOT be present
    const defaultMenuButton = screen.queryByTestId(`unifiedTabs_tabMenuBtn_${tabItem.id}`);
    expect(defaultMenuButton).not.toBeInTheDocument();
  });
});
