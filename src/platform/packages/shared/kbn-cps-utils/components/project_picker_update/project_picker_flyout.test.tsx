/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject } from '../../types';
import { getProjectPickerListItemSwitchTestSubj } from './blocks/list/list_item/list_item';
import { ProjectPickerFlyoutContent } from './project_picker_flyout';

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

const originProject: CPSProject = {
  _id: 'origin',
  _alias: 'Origin project',
  _type: 'observability',
  _organisation: 'test-org',
};

const linkedProjectOne: CPSProject = {
  _id: 'linked1',
  _alias: 'Linked project 1',
  _type: 'security',
  _organisation: 'test-org',
};

const linkedProjectTwo: CPSProject = {
  _id: 'linked2',
  _alias: 'Linked project 2',
  _type: 'elasticsearch',
  _organisation: 'test-org',
};

const availableProjects = [originProject, linkedProjectOne, linkedProjectTwo];

const createFetchProjectsByRouting = (projects: CPSProject[] = availableProjects) =>
  jest.fn(async (routing?: ProjectRouting) => {
    if (!routing) {
      return { origin: projects[0] ?? null, linkedProjects: projects.slice(1) };
    }

    const tagClauses = routing
      .split(' AND ')
      .map((clause) => clause.trim())
      .filter((clause) => clause.includes(':') && !clause.includes('_id'));

    const matched = projects.filter((project) =>
      tagClauses.every((clause) => {
        const separatorIndex = clause.indexOf(':');
        const tag = clause.slice(0, separatorIndex) as keyof CPSProject;
        const value = clause.slice(separatorIndex + 1);
        return project[tag] === value;
      })
    );

    if (matched.length === 0) {
      return { origin: null, linkedProjects: [] };
    }

    return {
      origin: matched[0],
      linkedProjects: matched.slice(1),
    };
  });

const renderFlyout = (
  overrides: Partial<React.ComponentProps<typeof ProjectPickerFlyoutContent>> = {}
) => {
  const onApplyChanges = overrides.onApplyChanges ?? jest.fn();
  const onClose = overrides.onClose ?? jest.fn();
  const props: React.ComponentProps<typeof ProjectPickerFlyoutContent> = {
    availableProjects,
    defaultProjectRoutingGetter: () => PROJECT_ROUTING.ALL,
    fetchProjectsByRouting: createFetchProjectsByRouting(),
    originProjectId: originProject._id,
    projectRouting: PROJECT_ROUTING.ALL,
    onApplyChanges,
    onClose,
    ...overrides,
  };

  const view = render(<ProjectPickerFlyoutContent {...props} />);

  return {
    onApplyChanges,
    onClose,
    rerender: (
      nextOverrides: Partial<React.ComponentProps<typeof ProjectPickerFlyoutContent>> = {}
    ) => view.rerender(<ProjectPickerFlyoutContent {...props} {...nextOverrides} />),
  };
};

describe('ProjectPickerFlyoutContent', () => {
  beforeEach(() => {
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables Discard and Apply on mount', async () => {
    renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(originProject._id))
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('projectPickerFlyoutDiscardButton')).toBeDisabled();
    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
  });

  it('can apply the current routing when canApplyUnchangedProjectRouting is true', async () => {
    const user = userEvent.setup();
    const { onApplyChanges } = renderFlyout({
      canApplyUnchangedProjectRouting: true,
      projectRouting: PROJECT_ROUTING.ALL,
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(originProject._id))
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('projectPickerFlyoutDiscardButton')).toBeDisabled();
    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();

    await user.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onApplyChanges).toHaveBeenCalledWith(PROJECT_ROUTING.ALL);
  });

  it('keeps Apply disabled while an initial filter proposal is pending', async () => {
    const fetchProjectsByRouting = jest.fn(() => new Promise<never>(() => {}));
    renderFlyout({
      canApplyUnchangedProjectRouting: true,
      defaultProjectRoutingGetter: () => PROJECT_ROUTING.ALL,
      fetchProjectsByRouting,
      projectRouting: '_type:security',
    });

    await waitFor(() => {
      expect(fetchProjectsByRouting).toHaveBeenCalledWith('_type:security');
    });

    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
  });

  it('enables Discard and Apply after excluding a project and applies the staged routing', async () => {
    const user = userEvent.setup();
    const { onApplyChanges } = renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
    });

    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();
    });
    expect(screen.getByTestId('projectPickerFlyoutDiscardButton')).toBeEnabled();

    await user.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onApplyChanges).toHaveBeenCalledWith('_id:* AND NOT _id:linked1');
  });

  it('applies selected projects as explicit ids in snapshot mode', async () => {
    const user = userEvent.setup();
    const { onApplyChanges } = renderFlyout({
      projectRoutingStrategy: 'snapshot',
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectTwo._id))
      ).toHaveAttribute('aria-checked', 'true');
    });

    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
    );
    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectTwo._id))
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();
    });

    await user.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onApplyChanges).toHaveBeenCalledWith('_id:origin');
  });

  it('disables Discard and Apply after round-tripping back to the baseline selection', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
    });

    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();
    });

    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    });
    expect(screen.getByTestId('projectPickerFlyoutDiscardButton')).toBeDisabled();
  });

  it('discards staged changes internally and restores the baseline selection', async () => {
    const user = userEvent.setup();
    const { onApplyChanges, onClose } = renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
    });

    await user.click(
      screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByTestId('projectPickerFlyoutDiscardButton'));

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByTestId('projectPickerFlyoutDiscardButton')).toBeDisabled();
    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    expect(onApplyChanges).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies the space default routing verbatim after revert', async () => {
    const user = userEvent.setup();
    const { onApplyChanges } = renderFlyout({
      projectRouting: '_id:* AND NOT _id:linked1',
      defaultProjectRoutingGetter: () => PROJECT_ROUTING.ORIGIN,
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'false');
    });

    await user.click(screen.getByTestId('projectPickerHeaderActionsButton'));
    await user.click(screen.getByText('Revert to space defaults'));

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();
    });

    await user.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onApplyChanges).toHaveBeenCalledWith(PROJECT_ROUTING.ORIGIN);
  });

  it('re-ingests a hydrated projectRouting prop before the user edits', async () => {
    const { rerender, onApplyChanges } = renderFlyout({
      projectRouting: PROJECT_ROUTING.ORIGIN,
      defaultProjectRoutingGetter: () => PROJECT_ROUTING.ORIGIN,
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'false');
    });

    rerender({ projectRouting: `_id:${linkedProjectOne._id}` });

    await waitFor(() => {
      expect(
        screen.getByTestId(getProjectPickerListItemSwitchTestSubj(linkedProjectOne._id))
      ).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    expect(onApplyChanges).not.toHaveBeenCalled();
  });
});
