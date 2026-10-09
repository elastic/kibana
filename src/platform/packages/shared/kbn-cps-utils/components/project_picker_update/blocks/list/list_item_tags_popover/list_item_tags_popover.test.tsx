/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CPSProject } from '../../../../../types';
import type { ProjectPickerState } from '../../../state/reducers';
import { FilterOperator, getFilterExpressionLookupKey } from '../../../utils/filter_input_codec';
import { ProjectPickerListItemTagsPopover } from './list_item_tags_popover';

const mockUseProjectPickerState = jest.fn();
const mockUseProjectPickerActions = jest.fn();

jest.mock('../../../state', () => {
  const actual = jest.requireActual('../../../state');
  return {
    ...actual,
    useProjectPickerState: () => mockUseProjectPickerState(),
    useProjectPickerActions: () => mockUseProjectPickerActions(),
  };
});

const defaultProject: CPSProject = {
  _id: 'project-a',
  _alias: 'project-a',
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _csp: 'AWS',
};

const projectTags = [{ tagName: 'env', tagValue: 'prod-a' }];

const envProdAExpression = {
  operator: FilterOperator.EQUALS,
  tagName: 'env',
  tagValue: 'prod-a',
} as const;

const createState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => ({
  filterExpressions: new Map(),
  filteringDimensions: [],
  availableProjects: new Map([[defaultProject._id, defaultProject]]),
  excludedOverrides: [],
  filteredProjectIds: [defaultProject._id],
  visibleProjectIds: [defaultProject._id],
  selectedProjects: [defaultProject._id],
  ...overrides,
});

let currentState = createState();

const addFilterExpression = jest.fn((payload: { expression: typeof envProdAExpression }) => {
  const id = getFilterExpressionLookupKey(payload.expression);
  const filterExpressions = new Map(currentState.filterExpressions);
  filterExpressions.set(id, { expression: payload.expression, enabled: true });
  currentState = { ...currentState, filterExpressions };
});

const defaultActions = {
  addFilterExpression,
};

const renderTagsPopover = (stateOverrides: Partial<ProjectPickerState> = {}) => {
  currentState = createState(stateOverrides);
  mockUseProjectPickerState.mockImplementation(() => currentState);
  mockUseProjectPickerActions.mockReturnValue(defaultActions);

  const anchor = document.createElement('button');
  anchor.type = 'button';
  anchor.textContent = 'Project tags trigger';
  document.body.appendChild(anchor);

  const closeHandler = jest.fn();

  const view = render(
    <ProjectPickerListItemTagsPopover
      button={anchor}
      isOpen={true}
      closeHandler={closeHandler}
      projectTags={projectTags}
    />
  );

  return {
    ...view,
    anchor,
    closeHandler,
  };
};

describe('ProjectPickerListItemTagsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentState = createState();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders encoded tag labels for each project tag', () => {
    renderTagsPopover();

    const popover = screen.getByLabelText('Project tags');
    expect(within(popover).getByText('env:prod-a')).toBeInTheDocument();
  });

  it('adds a filter when the add-filter badge is clicked', async () => {
    const user = userEvent.setup();
    renderTagsPopover();

    const popover = screen.getByLabelText('Project tags');
    const addFilterButton = within(popover).getByRole('button', {
      name: 'Add filter to project',
    });

    expect(addFilterButton).not.toBeDisabled();
    await user.click(addFilterButton);

    expect(addFilterExpression).toHaveBeenCalledWith({
      expression: envProdAExpression,
    });
  });

  it('disables the add-filter badge when that tag filter is already applied', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTagsPopover();

    const popover = screen.getByLabelText('Project tags');
    await user.click(
      within(popover).getByRole('button', {
        name: 'Add filter to project',
      })
    );

    rerender(
      <ProjectPickerListItemTagsPopover
        button={document.body.querySelector('button')!}
        isOpen={true}
        closeHandler={jest.fn()}
        projectTags={projectTags}
      />
    );

    expect(
      within(screen.getByLabelText('Project tags')).getByRole('button', {
        name: 'Add filter to project',
      })
    ).toBeDisabled();
  });

  it('disables the add-filter badge when the filter is already in state', () => {
    renderTagsPopover({
      filterExpressions: new Map([
        [
          getFilterExpressionLookupKey(envProdAExpression),
          { expression: envProdAExpression, enabled: true },
        ],
      ]),
    });

    const popover = screen.getByLabelText('Project tags');
    expect(within(popover).getByRole('button', { name: 'Add filter to project' })).toBeDisabled();
  });

  it('does not render an add-filter button in read-only mode', () => {
    // Opening the popover from the list in read-only is covered in list.test.tsx.
    renderTagsPopover({ isReadOnly: true });

    const popover = screen.getByLabelText('Project tags');
    expect(within(popover).getByText('env:prod-a')).toBeInTheDocument();
    expect(
      within(popover).queryByRole('button', { name: 'Add filter to project' })
    ).not.toBeInTheDocument();
  });
});
