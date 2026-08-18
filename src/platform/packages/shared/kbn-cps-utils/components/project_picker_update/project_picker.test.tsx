/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject } from '../../types';
import { ProjectPicker } from './project_picker';
import { ProjectPickerFlyout } from './project_picker_flyout';

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

const createProject = (id: string, tags: Partial<CPSProject> = {}): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  ...tags,
});

describe('ProjectPicker', () => {
  beforeEach(() => {
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it('preserves tag-only routing on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[
          createProject('p1', { _type: 'security' }),
          createProject('p2', { _type: 'observability' }),
        ]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_type:security"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('projectPickerListItemSwitch-p2')).not.toBeInTheDocument();
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves tag filters and decoded exclusions on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[
          createProject('p1', { _type: 'security' }),
          createProject('p2', { _type: 'security' }),
        ]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_type:security AND _id:* AND NOT _id:p2"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves explicit-ID snapshot routing on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[
          createProject('matching'),
          createProject('matching2'),
          createProject('non-matching'),
        ]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_id:matching AND _id:matching2"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-matching')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getByTestId('projectPickerListItemSwitch-matching2')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByTestId('projectPickerListItemSwitch-non-matching')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves an exact-all-ID snapshot on mount instead of rewriting to all projects', async () => {
    const onProjectRoutingChange = jest.fn();
    const exactAllIdsSnapshot = '_id:p1 AND _id:p2';

    render(
      <ProjectPicker
        availableProjects={[createProject('p1'), createProject('p2')]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting={exactAllIdsSnapshot}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('reports routing after the user changes project selection', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[createProject('p1'), createProject('p2')]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_id:p1 AND _id:p2"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    fireEvent.click(screen.getByTestId('projectPickerListItemSwitch-p2'));

    await waitFor(() => {
      expect(onProjectRoutingChange).toHaveBeenCalledWith('_id:p1');
    });
  });

  it('preserves named project routing references on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[createProject('p1'), createProject('p2')]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="@my-named-routing"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('renders the flyout variant and delegates actions to the consumer', async () => {
    const onApplyChanges = jest.fn();
    const onClose = jest.fn();
    const onDiscardChanges = jest.fn();

    render(
      <ProjectPickerFlyout
        availableProjects={[createProject('p1'), createProject('p2')]}
        onApplyChanges={onApplyChanges}
        onClose={onClose}
        onDiscardChanges={onDiscardChanges}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Change project scope' })).toBeInTheDocument();
    expect(screen.getByText('Using space defaults')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('projectPickerFlyoutBackButton'));
    fireEvent.click(screen.getByTestId('projectPickerFlyoutDiscardButton'));
    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDiscardChanges).toHaveBeenCalledTimes(1);
    expect(onApplyChanges).toHaveBeenCalledTimes(1);
  });

  it('exposes space defaults controls in the flyout variant', async () => {
    render(
      <ProjectPickerFlyout
        availableProjects={[createProject('p1'), createProject('p2')]}
        onApplyChanges={jest.fn()}
        onClose={jest.fn()}
        onDiscardChanges={jest.fn()}
        projectRouting="_id:p1"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('projectPickerHeaderActionsButton'));

    expect(screen.getByText('Clear project tag filters')).toBeInTheDocument();
    expect(screen.getByText('Revert to space defaults')).toBeInTheDocument();
  });

  it('reports the default project routing verbatim after reverting in the flyout variant', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPickerFlyout
        availableProjects={[createProject('p1'), createProject('p2')]}
        defaultProjectRouting={PROJECT_ROUTING.ORIGIN}
        onApplyChanges={jest.fn()}
        onClose={jest.fn()}
        onDiscardChanges={jest.fn()}
        onProjectRoutingChange={onProjectRoutingChange}
        originProjectId="p1"
        projectRouting="_id:p2"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('projectPickerHeaderActionsButton'));
    fireEvent.click(screen.getByText('Revert to space defaults'));

    await waitFor(() => {
      expect(onProjectRoutingChange).toHaveBeenCalledWith(PROJECT_ROUTING.ORIGIN);
    });
    expect(onProjectRoutingChange).not.toHaveBeenCalledWith(PROJECT_ROUTING.ALL);
    expect(onProjectRoutingChange).not.toHaveBeenCalledWith('_id:p1');
  });

  it('does not reset custom flyout routing while projects are loading', async () => {
    const onProjectRoutingChange = jest.fn();
    const props = {
      onApplyChanges: jest.fn(),
      onClose: jest.fn(),
      onDiscardChanges: jest.fn(),
      onProjectRoutingChange,
      projectRouting: '_id:p1',
    };

    const { rerender } = render(<ProjectPickerFlyout {...props} availableProjects={[]} />);

    expect(onProjectRoutingChange).not.toHaveBeenCalled();

    rerender(
      <ProjectPickerFlyout
        {...props}
        availableProjects={[createProject('p1'), createProject('p2')]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });
});
