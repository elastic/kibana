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
    await userEvent.dblClick(screen.getByTestId(tabButtonTestSubj));
    expect(screen.queryByText(tabItem.label)).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'new-label');
    expect(input).toHaveValue('new-label');
    await userEvent.keyboard('{enter}');
    expect(onLabelEdited).toHaveBeenCalledWith(tabItem, 'new-label');

    expect(screen.queryByTestId(tabButtonTestSubj)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('can cancel editing of tab label', async () => {
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
    await userEvent.dblClick(screen.getByTestId(tabButtonTestSubj));
    expect(screen.queryByText(tabItem.label)).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'new-label');
    expect(input).toHaveValue('new-label');
    await userEvent.keyboard('{escape}');

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId(tabButtonTestSubj)).toHaveFocus();
      expect(onLabelEdited).not.toHaveBeenCalled();
    });
  });
});
