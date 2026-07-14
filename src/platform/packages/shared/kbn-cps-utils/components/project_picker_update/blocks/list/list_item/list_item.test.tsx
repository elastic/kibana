/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProjectPickerListItem, type ProjectPickerListItemProps } from './list_item';

const defaultProps: ProjectPickerListItemProps = {
  isSelected: true,
  isToggleDisabled: false,
  project: {
    _id: '1',
    _alias: 'project-1',
    _type: 'project',
    _organisation: 'org-1',
  },
  toggleDisabledMessage: 'You must be searching a minimum of one project.',
  onContextMenu: jest.fn() as ProjectPickerListItemProps['onContextMenu'],
  onToggle: jest.fn() as ProjectPickerListItemProps['onToggle'],
};

const renderComponent = (props: Partial<ProjectPickerListItemProps> = {}) => {
  return render(<ProjectPickerListItem {...Object.assign(defaultProps, props)} />);
};

describe('ProjectPickerListItem', () => {
  it('should render', () => {
    renderComponent();
    expect(screen.getByTestId('projectPickerListItem')).toBeInTheDocument();
  });

  it('toggling the switch should invokes the onToggle function', async () => {
    const user = userEvent.setup();

    renderComponent({
      isSelected: false,
    });

    await user.click(screen.getByTestId('projectPickerListItemSwitch-1'));
    expect(defaultProps.onToggle).toHaveBeenCalledWith(defaultProps.project, true);
  });

  it('should render the project icon with the correct type', async () => {
    renderComponent({
      project: {
        _id: '1',
        _alias: 'project-1',
        _type: 'elasticsearch',
        _organisation: 'org-1',
      },
    });

    expect(screen.getByTestId('projectPickerListItemIcon')).toHaveAttribute(
      'data-euiicon-type',
      'logoElasticsearch'
    );
  });

  it('should render the context menu button', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByTestId('projectPickerListItemContextMenu-1'));

    expect(defaultProps.onContextMenu).toHaveBeenCalledWith(
      defaultProps.project,
      expect.any(Object)
    );
  });
});
