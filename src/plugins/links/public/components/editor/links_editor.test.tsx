/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import LinksEditor from './links_editor';
import { LinksStrings } from '../links_strings';
import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { ResolvedLink } from '../../types';

describe('LinksEditor', () => {
  const defaultProps = {
    onSaveToLibrary: jest.fn().mockImplementation(() => Promise.resolve()),
    onAddToDashboard: jest.fn(),
    onClose: jest.fn(),
    isByReference: false,
    flyoutId: 'test-id',
  };

  const someLinks: ResolvedLink[] = [
    {
      id: 'foo',
      type: 'dashboardLink' as const,
      order: 1,
      destination: '123',
      title: 'dashboard 01',
    },
    {
      id: 'bar',
      type: 'dashboardLink' as const,
      order: 4,
      destination: '456',
      title: 'dashboard 02',
      description: 'awesome dashboard if you ask me',
    },
    {
      id: 'bizz',
      type: 'externalLink' as const,
      order: 3,
      destination: 'http://example.com',
      title: 'http://example.com',
    },
    {
      id: 'buzz',
      type: 'externalLink' as const,
      order: 2,
      destination: 'http://elastic.co',
      title: 'Elastic website',
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows empty state with no links', async () => {
    render(<LinksEditor {...defaultProps} />);
    expect(screen.getByTestId('links--panelEditor--title')).toHaveTextContent(
      LinksStrings.editor.panelEditor.getCreateFlyoutTitle()
    );
    expect(screen.getByTestId('links--panelEditor--emptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('links--panelEditor--saveBtn')).toBeDisabled();

    await userEvent.click(screen.getByTestId('links--panelEditor--closeBtn'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('shows links in order', async () => {
    const expectedLinkIds = [...someLinks].sort((a, b) => a.order - b.order).map(({ id }) => id);
    render(<LinksEditor {...defaultProps} initialLinks={someLinks} />);
    expect(screen.getByTestId('links--panelEditor--title')).toHaveTextContent(
      LinksStrings.editor.panelEditor.getEditFlyoutTitle()
    );
    const draggableLinks = screen.getAllByTestId('links--panelEditor--draggableLink');
    expect(draggableLinks.length).toEqual(4);

    draggableLinks.forEach((link, idx) => {
      expect(link).toHaveAttribute('data-rfd-draggable-id', expectedLinkIds[idx]);
    });
  });

  test('saving by reference panels calls onSaveToLibrary', async () => {
    const orderedLinks = [...someLinks].sort((a, b) => a.order - b.order);
    render(<LinksEditor {...defaultProps} initialLinks={someLinks} isByReference />);
    const saveButton = screen.getByTestId('links--panelEditor--saveBtn');
    userEvent.click(saveButton);
    await waitFor(() => expect(defaultProps.onSaveToLibrary).toHaveBeenCalledTimes(1));
    expect(defaultProps.onSaveToLibrary).toHaveBeenCalledWith(orderedLinks, LINKS_VERTICAL_LAYOUT);
  });

  test('saving by value panel calls onAddToDashboard', async () => {
    const orderedLinks = [...someLinks].sort((a, b) => a.order - b.order);
    render(<LinksEditor {...defaultProps} initialLinks={someLinks} isByReference={false} />);
    const saveButton = screen.getByTestId('links--panelEditor--saveBtn');
    userEvent.click(saveButton);
    expect(defaultProps.onAddToDashboard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onAddToDashboard).toHaveBeenCalledWith(orderedLinks, LINKS_VERTICAL_LAYOUT);
  });
});
