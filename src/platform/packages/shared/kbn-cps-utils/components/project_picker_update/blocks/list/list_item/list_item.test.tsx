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

const defaultProject: ProjectPickerListItemProps['project'] = {
  _id: '1',
  _alias: 'project-1',
  _type: 'project',
  _organisation: 'org-1',
};

const createDefaultProps = (): ProjectPickerListItemProps => ({
  isSelected: true,
  isToggleDisabled: false,
  project: defaultProject,
  toggleDisabledMessage: 'You must be searching a minimum of one project.',
  onContextMenu: jest.fn() as ProjectPickerListItemProps['onContextMenu'],
  onToggle: jest.fn() as ProjectPickerListItemProps['onToggle'],
  onLabelClick: jest.fn() as ProjectPickerListItemProps['onLabelClick'],
});

const renderComponent = (props: Partial<ProjectPickerListItemProps> = {}) => {
  const defaultProps = createDefaultProps();
  const mergedProps = { ...defaultProps, ...props };

  return {
    ...render(<ProjectPickerListItem {...mergedProps} />),
    props: mergedProps,
  };
};

describe('ProjectPickerListItem', () => {
  it('should render', () => {
    renderComponent();
    expect(screen.getByTestId('projectPickerListItem')).toBeInTheDocument();
  });

  it('toggling the switch should invokes the onToggle function', async () => {
    const user = userEvent.setup();

    const { props } = renderComponent({
      isSelected: false,
    });

    await user.click(screen.getByTestId('projectPickerListItemSwitch-1'));
    expect(props.onToggle).toHaveBeenCalledWith(props.project, true);
  });

  it('should render the project icon with the correct type', () => {
    renderComponent({
      project: {
        ...defaultProject,
        _type: 'elasticsearch',
      },
    });

    const item = screen.getByTestId('projectPickerListItem');
    expect(item.querySelector('[data-euiicon-type="logoElasticsearch"]')).toBeInTheDocument();
  });

  it('should render the context menu button', async () => {
    const user = userEvent.setup();

    const { props } = renderComponent();

    await user.click(screen.getByTestId('projectPickerListItemContextMenu-1'));

    expect(props.onContextMenu).toHaveBeenCalledWith(props.project, expect.any(Object));
  });

  it('should not render a tags badge when the project has no custom tags', () => {
    renderComponent();

    expect(screen.queryByTestId('projectPickerListItemTags')).not.toBeInTheDocument();
  });

  it('should render a tags badge with the custom tag count', () => {
    renderComponent({
      project: {
        ...defaultProject,
        env: 'prod',
        team: 'search',
      },
    });

    expect(screen.getByTestId('projectPickerListItemTags')).toHaveTextContent('2');
  });

  it('should invoke onLabelClick when the tags badge is clicked', async () => {
    const user = userEvent.setup();

    const { props } = renderComponent({
      project: {
        ...defaultProject,
        env: 'prod',
        team: 'search',
      },
    });

    await user.click(screen.getByTestId('projectPickerListItemTags'));

    expect(props.onLabelClick).toHaveBeenCalledWith(props.project, expect.any(Object));
  });

  describe('read-only mode', () => {
    const projectWithTags = {
      ...defaultProject,
      env: 'prod',
      team: 'search',
    };

    it('does not render the inclusion switch or context menu', () => {
      renderComponent({
        isReadOnly: true,
        project: projectWithTags,
      });

      expect(screen.queryByTestId('projectPickerListItemSwitch-1')).toBeDisabled();
      expect(screen.queryByTestId('projectPickerListItemContextMenu-1')).toBeDisabled();
    });

    it('still renders the tags badge and invokes onLabelClick when clicked', async () => {
      const user = userEvent.setup();

      const { props } = renderComponent({
        isReadOnly: true,
        project: projectWithTags,
      });

      expect(screen.getByTestId('projectPickerListItemTags')).toHaveTextContent('2');
      await user.click(screen.getByTestId('projectPickerListItemTags'));

      expect(props.onLabelClick).toHaveBeenCalledWith(props.project, expect.any(Object));
    });
  });
});
