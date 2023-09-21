/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import NavigationEmbeddablePanelEditor from './links_panel_editor';
import { NavEmbeddableStrings } from '../links_strings';
import { NavigationEmbeddableLink, NAV_VERTICAL_LAYOUT } from '../../../common/content_management';
import { fetchDashboard } from '../dashboard_link/dashboard_link_tools';

jest.mock('../dashboard_link/dashboard_link_tools', () => {
  return {
    fetchDashboard: jest.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        status: 'success',
        attributes: {
          title: `dashboard #${id}`,
          description: '',
          panelsJSON: [],
          timeRestore: false,
          version: '1',
        },
        references: [],
      })
    ),
  };
});

describe('NavigationEmbeddablePanelEditor', () => {
  const defaultProps = {
    onSaveToLibrary: jest.fn().mockImplementation(() => Promise.resolve()),
    onAddToDashboard: jest.fn(),
    onClose: jest.fn(),
    isByReference: false,
  };

  const someLinks: NavigationEmbeddableLink[] = [
    {
      id: 'foo',
      type: 'dashboardLink' as const,
      order: 1,
      destination: '123',
    },
    {
      id: 'bar',
      type: 'dashboardLink' as const,
      order: 4,
      destination: '456',
    },
    {
      id: 'bizz',
      type: 'externalLink' as const,
      order: 3,
      destination: 'http://example.com',
    },
    {
      id: 'buzz',
      type: 'externalLink' as const,
      order: 2,
      destination: 'http://elastic.co',
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows empty state with no links', async () => {
    render(<NavigationEmbeddablePanelEditor {...defaultProps} />);
    expect(screen.getByTestId('navEmbeddable--panelEditor--title')).toHaveTextContent(
      NavEmbeddableStrings.editor.panelEditor.getCreateFlyoutTitle()
    );
    expect(screen.getByTestId('navEmbeddable--panelEditor--emptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('navEmbeddable--panelEditor--saveBtn')).toBeDisabled();

    await userEvent.click(screen.getByTestId('navEmbeddable--panelEditor--closeBtn'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('shows links in order', async () => {
    const expectedLinkIds = [...someLinks].sort((a, b) => a.order - b.order).map(({ id }) => id);
    render(<NavigationEmbeddablePanelEditor {...defaultProps} initialLinks={someLinks} />);
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('navEmbeddable--panelEditor--title')).toHaveTextContent(
      NavEmbeddableStrings.editor.panelEditor.getEditFlyoutTitle()
    );
    const draggableLinks = screen.getAllByTestId('navEmbeddable--panelEditor--draggableLink');
    expect(draggableLinks.length).toEqual(4);

    draggableLinks.forEach((link, idx) => {
      expect(link).toHaveAttribute('data-rfd-draggable-id', expectedLinkIds[idx]);
    });
  });

  test('saving by reference panels calls onSaveToLibrary', async () => {
    const orderedLinks = [...someLinks].sort((a, b) => a.order - b.order);
    render(
      <NavigationEmbeddablePanelEditor {...defaultProps} initialLinks={someLinks} isByReference />
    );
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
    const saveButton = screen.getByTestId('navEmbeddable--panelEditor--saveBtn');
    await userEvent.click(saveButton);
    await waitFor(() => expect(defaultProps.onSaveToLibrary).toHaveBeenCalledTimes(1));
    expect(defaultProps.onSaveToLibrary).toHaveBeenCalledWith(orderedLinks, NAV_VERTICAL_LAYOUT);
  });

  test('saving by value panel calls onAddToDashboard', async () => {
    const orderedLinks = [...someLinks].sort((a, b) => a.order - b.order);
    render(
      <NavigationEmbeddablePanelEditor
        {...defaultProps}
        initialLinks={someLinks}
        isByReference={false}
      />
    );
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
    const saveButton = screen.getByTestId('navEmbeddable--panelEditor--saveBtn');
    await userEvent.click(saveButton);
    expect(defaultProps.onAddToDashboard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onAddToDashboard).toHaveBeenCalledWith(orderedLinks, NAV_VERTICAL_LAYOUT);
  });
});
