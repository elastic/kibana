/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import type { NavExtensionPointContext } from '../types';
import type { ListTemplateConfig } from './list_template';
import { ListTemplate } from './list_template';

interface TestRow {
  id: string;
  label: string;
  href: string;
  iconType?: string;
}

const SLOT_ID = 'recent-dashboards';
const EXTENSION_ID = 'recentlyAccessedDashboards';

const defaultContext: NavExtensionPointContext = {
  slotId: SLOT_ID,
  extensionId: EXTENSION_ID,
  primaryItemId: 'dashboards',
  sectionId: 'dashboards-section',
  surface: 'sidePanel',
};

const defaultConfig: ListTemplateConfig<TestRow> = {
  item: {
    idField: 'id',
    labelField: 'label',
    hrefField: 'href',
  },
};

const testRows: TestRow[] = [
  { id: '1', label: 'Alpha dashboard', href: '/app/dashboards#/view/1' },
  { id: '2', label: 'Beta dashboard', href: '/app/dashboards#/view/2' },
  { id: '3', label: 'Gamma dashboard', href: '/app/dashboards#/view/3' },
];

const clickIconButton = (iconType: string) => {
  const button = screen
    .getAllByRole('button')
    .find((candidate) => candidate.querySelector(`[data-euiicon-type="${iconType}"]`));

  if (!button) {
    throw new Error(`Unable to find button with icon type "${iconType}"`);
  }

  fireEvent.click(button);
};

const renderListTemplate = ({
  data = testRows,
  config = defaultConfig,
  context = defaultContext,
  onAction = jest.fn(),
}: {
  data?: TestRow[];
  config?: ListTemplateConfig<TestRow>;
  context?: NavExtensionPointContext;
  onAction?: jest.Mock;
} = {}) => {
  const view = renderWithEuiTheme(
    <ListTemplate data={data} config={config} context={context} onAction={onAction} />
  );

  return { ...view, onAction };
};

describe('ListTemplate', () => {
  it('renders list items with labels and hrefs', () => {
    renderListTemplate();

    const alphaLink = screen.getByRole('link', { name: 'Alpha dashboard' });
    const betaLink = screen.getByRole('link', { name: 'Beta dashboard' });

    expect(alphaLink).toHaveAttribute('href', '/app/dashboards#/view/1');
    expect(betaLink).toHaveAttribute('href', '/app/dashboards#/view/2');
  });

  it('caps rendered rows when max is configured', () => {
    renderListTemplate({
      config: {
        ...defaultConfig,
        max: 2,
      },
    });

    expect(screen.getByRole('link', { name: 'Alpha dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gamma dashboard' })).not.toBeInTheDocument();
  });

  it('skips rows missing required fields', () => {
    renderListTemplate({
      data: [
        { id: '1', label: 'Valid row', href: '/valid' },
        { id: '2', label: '', href: '/missing-label' },
        { id: '', label: 'Missing id', href: '/missing-id' },
        { id: '4', label: 'Missing href', href: '' },
      ],
    });

    expect(screen.getByRole('link', { name: 'Valid row' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Missing label' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Missing id' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Missing href' })).not.toBeInTheDocument();
  });

  it('returns null when there is no data and no empty message', () => {
    const { container } = renderListTemplate({ data: [] });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the empty message when configured', () => {
    renderListTemplate({
      data: [],
      config: {
        ...defaultConfig,
        emptyMessage: 'No dashboards yet',
      },
    });

    expect(screen.getByTestId(`nav-extension-${SLOT_ID}-empty`)).toHaveTextContent(
      'No dashboards yet'
    );
  });

  it('renders the heading when configured', () => {
    renderListTemplate({
      config: {
        ...defaultConfig,
        heading: 'Recently viewed',
      },
    });

    expect(screen.getByRole('heading', { name: 'Recently viewed' })).toBeInTheDocument();
  });

  it('filters rows client-side when search is enabled', async () => {
    renderListTemplate({
      config: {
        ...defaultConfig,
        heading: 'Recently viewed',
        search: { enabled: true, placeholder: 'Search dashboards' },
      },
    });

    clickIconButton('search');

    const searchInput = await screen.findByTestId(`nav-extension-${SLOT_ID}-search`);
    fireEvent.change(searchInput, { target: { value: 'beta' } });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Beta dashboard' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Alpha dashboard' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Gamma dashboard' })).not.toBeInTheDocument();
    });
  });

  it('invokes onAction with add when the add-item button is clicked', () => {
    const onAction = jest.fn();

    renderListTemplate({
      onAction,
      config: {
        ...defaultConfig,
        heading: 'Recently viewed',
        supportAddItem: true,
        search: { enabled: true },
      },
    });

    clickIconButton('plus');

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('add', EXTENSION_ID, null);
  });

  it('invokes onAction when a row action is selected from the menu', async () => {
    const onAction = jest.fn();

    renderListTemplate({
      onAction,
      config: {
        ...defaultConfig,
        heading: 'Recently viewed',
        actions: [
          { id: 'delete', label: 'Delete', icon: 'trash' },
          { id: 'edit', label: 'Edit', icon: 'pencil' },
        ],
      },
    });

    fireEvent.click(screen.getByTestId(`nav-extension-${SLOT_ID}-action-menu-1`));

    const deleteAction = await screen.findByTestId(`nav-extension-${EXTENSION_ID}-action-delete`);
    fireEvent.click(deleteAction);

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith('delete', EXTENSION_ID, testRows[0]);
    });
  });

  it('does not render row action menus when actions are not configured', () => {
    renderListTemplate();

    expect(screen.queryByTestId(`nav-extension-${SLOT_ID}-action-menu-1`)).not.toBeInTheDocument();
  });

  it('renders icons when iconField is configured', () => {
    renderListTemplate({
      data: [
        {
          id: '1',
          label: 'Dashboard with icon',
          href: '/app/dashboards#/view/1',
          iconType: 'dashboardApp',
        },
      ],
      config: {
        item: {
          idField: 'id',
          labelField: 'label',
          hrefField: 'href',
          iconField: 'iconType',
        },
      },
    });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard with icon' });

    expect(dashboardLink.querySelector('[data-euiicon-type="dashboardApp"]')).toBeInTheDocument();
  });
});
