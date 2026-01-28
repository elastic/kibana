/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ContentFrameworkSection, type ContentFrameworkSectionProps } from './section';

const defaultProps: ContentFrameworkSectionProps = {
  title: 'Test Section',
  description: 'Section description',
  actions: [
    {
      icon: 'expand',
      onClick: jest.fn(),
      ariaLabel: 'Expand section',
      dataTestSubj: 'unifiedDocViewerSectionActionButton-expand',
    },
    {
      icon: 'fullScreen',
      onClick: jest.fn(),
      ariaLabel: 'Full screen',
      dataTestSubj: 'unifiedDocViewerSectionActionButton-fullScreen',
      label: 'Full Screen',
    },
  ],
  children: <div>Section children</div>,
  id: 'testSection',
  'data-test-subj': 'testSection',
};

describe('ContentFrameworkSection', () => {
  it('renders the title', () => {
    render(<ContentFrameworkSection {...defaultProps} />);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders EuiBetaBadge when isTechPreview is true', () => {
    const props = { ...defaultProps, isTechPreview: true };
    render(<ContentFrameworkSection {...props} />);
    expect(screen.getByTestId('ContentFrameworkSectionEuiBetaBadge')).toBeInTheDocument();
  });

  it('renders the description as EuiIconTip', () => {
    render(<ContentFrameworkSection {...defaultProps} />);
    expect(screen.getByText('Section description')).toBeInTheDocument();
  });

  it('renders actions as buttons', () => {
    render(<ContentFrameworkSection {...defaultProps} />);

    expect(screen.getByTestId('unifiedDocViewerSectionActionButton-expand')).toBeInTheDocument();
    expect(
      screen.getByTestId('unifiedDocViewerSectionActionButton-fullScreen')
    ).toBeInTheDocument();
    expect(screen.getByText('Full Screen')).toBeInTheDocument();
  });

  it('calls onClick when action button is clicked', () => {
    render(<ContentFrameworkSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('unifiedDocViewerSectionActionButton-expand'));
    expect(defaultProps.actions?.[0].onClick).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('unifiedDocViewerSectionActionButton-fullScreen'));
    expect(defaultProps.actions?.[1].onClick).toHaveBeenCalled();
  });

  it('prefers onClick over href on plain left click', () => {
    const onClick = jest.fn();
    render(
      <ContentFrameworkSection
        {...defaultProps}
        actions={[
          {
            icon: 'discoverApp',
            ariaLabel: 'Open in Discover',
            dataTestSubj: 'unifiedDocViewerSectionActionButton-openInDiscover',
            label: 'Open in Discover',
            href: '/app/discover',
            onClick,
          },
        ]}
      />
    );

    const button = screen.getByTestId('unifiedDocViewerSectionActionButton-openInDiscover');
    const clickEvent = createEvent.click(button, { button: 0 });
    fireEvent(button, clickEvent);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('does not intercept modifier click when href is present', () => {
    const onClick = jest.fn();
    render(
      <ContentFrameworkSection
        {...defaultProps}
        actions={[
          {
            icon: 'discoverApp',
            ariaLabel: 'Open in Discover',
            dataTestSubj: 'unifiedDocViewerSectionActionButton-openInDiscover',
            label: 'Open in Discover',
            href: '/app/discover',
            onClick,
          },
        ]}
      />
    );

    const button = screen.getByTestId('unifiedDocViewerSectionActionButton-openInDiscover');
    const ctrlClickEvent = createEvent.click(button, { button: 0, ctrlKey: true });
    fireEvent(button, ctrlClickEvent);

    expect(onClick).not.toHaveBeenCalled();
    expect(ctrlClickEvent.defaultPrevented).toBe(false);
  });

  it('does not intercept middle click when href is present', () => {
    const onClick = jest.fn();
    render(
      <ContentFrameworkSection
        {...defaultProps}
        actions={[
          {
            icon: 'discoverApp',
            ariaLabel: 'Open in Discover',
            dataTestSubj: 'unifiedDocViewerSectionActionButton-openInDiscoverIcon',
            href: '/app/discover',
            onClick,
          },
        ]}
      />
    );

    const button = screen.getByTestId('unifiedDocViewerSectionActionButton-openInDiscoverIcon');
    const middleClickEvent = createEvent.click(button, { button: 1 });
    fireEvent(button, middleClickEvent);

    expect(onClick).not.toHaveBeenCalled();
    expect(middleClickEvent.defaultPrevented).toBe(false);
  });

  it('renders children inside the panel', () => {
    render(<ContentFrameworkSection {...defaultProps} />);
    expect(screen.getByText('Section children')).toBeInTheDocument();
  });

  it('does not render description if not provided', () => {
    const props = { ...defaultProps, description: undefined };
    render(<ContentFrameworkSection {...props} />);
    expect(screen.queryByLabelText('Section description')).not.toBeInTheDocument();
  });

  it('does not render actions if not provided', () => {
    const props = { ...defaultProps, actions: undefined };
    render(<ContentFrameworkSection {...props} />);
    expect(
      screen.queryByTestId('unifiedDocViewerSectionActionButton-expand')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('unifiedDocViewerSectionActionButton-fullScreen')
    ).not.toBeInTheDocument();
  });

  it('calls onToggle when the accordion is toggled', async () => {
    const onToggle = jest.fn();
    render(<ContentFrameworkSection {...defaultProps} onToggle={onToggle} forceState="open" />);
    const toggleBtn = screen.getByText('Test Section');
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalled();
  });
});
