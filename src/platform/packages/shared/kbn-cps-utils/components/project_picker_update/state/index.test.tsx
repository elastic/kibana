/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject, ProjectsData } from '../../../types';
import { ProjectPickerList } from '../blocks/list/list';
import { getProjectPickerListItemSwitchTestSubj } from '../blocks/list/list_item/list_item';
import { ProjectPickerFrameHeader } from '../blocks/frame/partials/header/header';
import { ProjectPickerFrameBodyHeader } from '../blocks/frame/partials/body/body';
import { FilterOperator, type FilterExpressionValue } from '../utils/filter_input_codec';
import { projectRoutingCodec, type ProjectRoutingExpression } from '../utils/project_routing_codec';
import {
  ProjectPickerStateProvider,
  useProjectPickerActions,
  useProjectPickerState,
  type ProjectPickerStateProviderProps,
} from '.';

const emptyEncodeInput: Omit<ProjectRoutingExpression, 'projectRoutingStrategy'> = {
  filterExpressions: [],
  excludedProjectIds: [],
  selectedProjectIds: [],
};

const getProjectListItemSwitch = (projectId: CPSProject['_id']) =>
  screen.getByTestId(getProjectPickerListItemSwitchTestSubj(projectId));

const toggleProjectListItemSwitch = (user: UserEvent, projectId: CPSProject['_id']) =>
  user.click(getProjectListItemSwitch(projectId));

const originProject: CPSProject = {
  _id: 'origin',
  _alias: 'Origin project',
  _type: 'observability',
  _organisation: 'test-org',
  _region: 'us-east-1',
  _csp: 'AWS',
};

const linkedProjectOne: CPSProject = {
  _id: 'linked1',
  _alias: 'Linked project 1',
  _type: 'security',
  _organisation: 'test-org',
  _region: 'us-east-1',
  _csp: 'AWS',
};

const linkedProjectTwo: CPSProject = {
  _id: 'linked2',
  _alias: 'Linked project 2',
  _type: 'elasticsearch',
  _organisation: 'test-org',
  _region: 'us-east-1',
  _csp: 'AWS',
};

const availableProjects = [originProject, linkedProjectOne, linkedProjectTwo];

/**
 * Test double for server filter search: returns catalog projects matching simple tag:value clauses.
 */
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
        if (value === '*') {
          return project[tag] != null && project[tag] !== '';
        }
        return project[tag] === value;
      })
    );

    if (matched.length === 0) {
      return { origin: null, linkedProjects: [] };
    }

    const origin =
      projects[0] && matched.some((p) => p._id === projects[0]._id) ? projects[0] : matched[0];
    return {
      origin: matched.find((p) => p._id === origin._id) ?? matched[0],
      linkedProjects: matched.filter((p) => p._id !== origin._id),
    };
  });

const defaultProviderProps: Omit<ProjectPickerStateProviderProps, 'children'> = {
  availableProjects,
  originProjectId: originProject._id,
  defaultProjectRoutingGetter: () => '',
  currentProjectRoutingGetter: () => '',
  onProjectRoutingChange: jest.fn(),
  fetchProjectsByRouting: createFetchProjectsByRouting(),
};

const renderProjectPicker = (
  props: Partial<Omit<ProjectPickerStateProviderProps, 'children'>> = {}
) => {
  const onProjectRoutingChange = props.onProjectRoutingChange ?? jest.fn();

  const buildTree = (currentProps: Partial<Omit<ProjectPickerStateProviderProps, 'children'>>) => (
    <ProjectPickerStateProvider
      {...defaultProviderProps}
      {...currentProps}
      onProjectRoutingChange={onProjectRoutingChange}
    >
      <ProjectPickerList />
    </ProjectPickerStateProvider>
  );

  const { rerender } = render(buildTree(props));

  return {
    onProjectRoutingChange,
    rerender: (nextProps: Partial<Omit<ProjectPickerStateProviderProps, 'children'>>) =>
      rerender(buildTree({ ...props, ...nextProps })),
  };
};

const renderFullProjectPicker = (
  props: Partial<Omit<ProjectPickerStateProviderProps, 'children'>> = {}
) => {
  const onProjectRoutingChange = props.onProjectRoutingChange ?? jest.fn();

  render(
    <ProjectPickerStateProvider
      {...defaultProviderProps}
      {...props}
      onProjectRoutingChange={onProjectRoutingChange}
    >
      <ProjectPickerFrameHeader />
      <ProjectPickerFrameBodyHeader />
      <ProjectPickerList />
    </ProjectPickerStateProvider>
  );

  return { onProjectRoutingChange };
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const clickRevertToSpaceDefaults = async (user: UserEvent) => {
  const globalActionsButton = screen.getByTestId('projectPickerGlobalActionsButton');
  await user.click(globalActionsButton);
  await user.click(screen.getByText('Revert to space defaults').closest('button')!);
};

const AddFilterExpression = ({
  expression,
  testSubj = 'addFilterExpression',
}: {
  expression: FilterExpressionValue;
  testSubj?: string;
}) => {
  const actions = useProjectPickerActions();

  return (
    <button
      type="button"
      data-test-subj={testSubj}
      onClick={() => actions.addFilterExpression({ expression })}
    />
  );
};

const ReadPickerState = ({
  onChange,
}: {
  onChange: (state: ReturnType<typeof useProjectPickerState>) => void;
}) => {
  const state = useProjectPickerState();

  React.useEffect(() => {
    onChange(state);
  }, [onChange, state]);

  return null;
};

describe('ProjectPickerStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('projectRoutingStrategy', () => {
    describe('dynamic', () => {
      it('does not call onProjectRoutingChange on mount when routing is already in sync', async () => {
        const { onProjectRoutingChange } = renderProjectPicker({
          currentProjectRoutingGetter: () => '_id:*',
          defaultProjectRoutingGetter: () => '_id:*',
        });

        await waitFor(() => {
          expect(onProjectRoutingChange).not.toHaveBeenCalled();
        });
      });

      it('prefills the default tag filter on mount', async () => {
        const onProjectRoutingChange = jest.fn();
        const onStateChange = jest.fn();

        render(
          <ProjectPickerStateProvider
            {...defaultProviderProps}
            availableProjects={[
              { ...originProject, _alias: 'origin' },
              linkedProjectOne,
              linkedProjectTwo,
            ]}
            defaultProjectRoutingGetter={() => '_alias:origin'}
            currentProjectRoutingGetter={() => '_alias:origin'}
            onProjectRoutingChange={onProjectRoutingChange}
          >
            <ReadPickerState onChange={onStateChange} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        await waitFor(() => {
          expect(onStateChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ currentProjectRouting: '_alias:origin' })
          );
        });
        expect(onProjectRoutingChange).not.toHaveBeenCalled();
      });

      it('calls onProjectRoutingChange with exclusions when a project is deselected', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });

        renderProjectPicker({
          projectRoutingStrategy: 'dynamic',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        await toggleProjectListItemSwitch(user, linkedProjectOne._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:* AND NOT _id:linked1');
        });
      });

      it('includes encoded filter expressions without _id clauses until a project is excluded', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        const securityTypeFilter = {
          operator: FilterOperator.EQUALS,
          tagName: '_type',
          tagValue: 'security',
        } as const;

        render(
          <ProjectPickerStateProvider
            {...defaultProviderProps}
            projectRoutingStrategy="dynamic"
            onProjectRoutingChange={onProjectRoutingChange}
            currentProjectRoutingGetter={() => currentRouting}
          >
            <AddFilterExpression expression={securityTypeFilter} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_type:security');
        });
      });
    });

    describe('snapshot', () => {
      it('does not call onProjectRoutingChange on mount and emits clauses for all projects once the user makes a change', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        expect(onProjectRoutingChange).not.toHaveBeenCalled();

        // deselecting and reselecting a project is a user change that results in all projects selected
        await toggleProjectListItemSwitch(user, linkedProjectOne._id);
        await toggleProjectListItemSwitch(user, linkedProjectOne._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith(
            '_id:origin OR _id:linked1 OR _id:linked2'
          );
        });
      });

      it('omits deselected projects from the explicit id clauses once exclusions exist', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        await toggleProjectListItemSwitch(user, linkedProjectOne._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin OR _id:linked2');
        });
      });

      it('emits `_id:origin` when only the origin project remains selected with no filters', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        await toggleProjectListItemSwitch(user, linkedProjectOne._id);
        await toggleProjectListItemSwitch(user, linkedProjectTwo._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin');
        });
      });

      it('emits PROJECT_ROUTING.ORIGIN when exists `_alias` is the only filter and origin is the only selection', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        const aliasExistsFilter = {
          operator: FilterOperator.EXISTS,
          tagName: '_alias',
          tagValue: undefined,
        } as const;

        render(
          <ProjectPickerStateProvider
            {...defaultProviderProps}
            projectRoutingStrategy="snapshot"
            onProjectRoutingChange={onProjectRoutingChange}
            currentProjectRoutingGetter={() => currentRouting}
          >
            <AddFilterExpression expression={aliasExistsFilter} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalled();
        });

        await toggleProjectListItemSwitch(user, linkedProjectOne._id);
        await toggleProjectListItemSwitch(user, linkedProjectTwo._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith(PROJECT_ROUTING.ORIGIN);
        });
      });

      it('includes encoded filter expressions with explicit id clauses that omit a project when it is excluded', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });
        const securityTypeFilter = {
          operator: FilterOperator.EQUALS,
          tagName: '_type',
          tagValue: 'security',
        } as const;

        render(
          <ProjectPickerStateProvider
            {...defaultProviderProps}
            projectRoutingStrategy="snapshot"
            onProjectRoutingChange={onProjectRoutingChange}
            currentProjectRoutingGetter={() => currentRouting}
          >
            <AddFilterExpression expression={securityTypeFilter} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        expect(onProjectRoutingChange).not.toHaveBeenCalled();

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          // the _type:security clause is added to the filter expression, which excludes project with id linked2
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_type:security AND _id:linked1');
        });
      });
    });

    describe('cross-strategy routing', () => {
      it('decodes a dynamic routing string in a snapshot picker and converts it once the user makes a change', async () => {
        const user = userEvent.setup();

        let currentRouting: ProjectRouting = projectRoutingCodec.encode({
          ...emptyEncodeInput,
          excludedProjectIds: [linkedProjectOne._id],
          projectRoutingStrategy: 'dynamic',
        });

        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });

        renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        // the dynamic exclusion is reflected in the list without rewriting the routing string
        expect(getProjectListItemSwitch(linkedProjectOne._id)).toHaveAttribute(
          'aria-checked',
          'false'
        );
        expect(onProjectRoutingChange).not.toHaveBeenCalled();

        // Now we exclude the second project
        await toggleProjectListItemSwitch(user, linkedProjectTwo._id);

        // Now we expect the generated routing to be the origin project only
        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin');
        });
      });

      it('decodes a snapshot routing string in a dynamic picker and converts it once the user makes a change', async () => {
        const user = userEvent.setup();

        let currentRouting: ProjectRouting = projectRoutingCodec.encode({
          ...emptyEncodeInput,
          selectedProjectIds: [originProject._id, linkedProjectTwo._id],
          projectRoutingStrategy: 'snapshot',
        });

        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });

        // We start with the origin project and the second project selected
        renderProjectPicker({
          projectRoutingStrategy: 'dynamic',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        // the project missing from the snapshot id list is reflected as excluded without a rewrite
        expect(getProjectListItemSwitch(linkedProjectOne._id)).toHaveAttribute(
          'aria-checked',
          'false'
        );
        expect(onProjectRoutingChange).not.toHaveBeenCalled();

        // Now we include the first project
        await toggleProjectListItemSwitch(user, linkedProjectOne._id);

        // Now we expect the generated routing to specify all available projects, since we have no exclusions
        await waitFor(() => {
          // with every project re-included the codec itself never emits a clause, so this
          // falls back to the canonical PROJECT_ROUTING.ALL constant
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith(PROJECT_ROUTING.ALL);
        });
      });
    });

    describe('strategy prop changes', () => {
      it('re-encodes the routing with the new strategy when the prop changes after a user edit', async () => {
        const user = userEvent.setup();
        let currentRouting: ProjectRouting = '';
        const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
          currentRouting = routing;
        });

        const { rerender } = renderProjectPicker({
          projectRoutingStrategy: 'dynamic',
          onProjectRoutingChange,
          currentProjectRoutingGetter: () => currentRouting,
        });

        await toggleProjectListItemSwitch(user, linkedProjectOne._id);

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:* AND NOT _id:linked1');
        });

        rerender({ projectRoutingStrategy: 'snapshot' });

        // the same exclusion is now encoded as an explicit snapshot enumeration
        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin OR _id:linked2');
        });
      });

      it('reports nothing when the strategy changes before any user edit', async () => {
        const { onProjectRoutingChange, rerender } = renderProjectPicker({
          projectRoutingStrategy: 'dynamic',
        });

        rerender({ projectRoutingStrategy: 'snapshot' });

        await waitFor(() => {
          expect(onProjectRoutingChange).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('isUsingSpaceDefaults', () => {
    it('is true on mount when current routing matches the default', async () => {
      const onStateChange = jest.fn();

      render(
        <ProjectPickerStateProvider
          {...defaultProviderProps}
          currentProjectRoutingGetter={() => PROJECT_ROUTING.ALL}
          defaultProjectRoutingGetter={() => PROJECT_ROUTING.ALL}
        >
          <ReadPickerState onChange={onStateChange} />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            currentProjectRouting: PROJECT_ROUTING.ALL,
            isUsingSpaceDefaults: true,
          })
        );
      });
    });

    it('recovers after a snapshot-mode revert and reports the default routing verbatim', async () => {
      const user = userEvent.setup();
      const onStateChange = jest.fn();
      let currentRouting: ProjectRouting = '_organisation:test-org';
      const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
        currentRouting = routing;
      });

      render(
        <ProjectPickerStateProvider
          {...defaultProviderProps}
          projectRoutingStrategy="snapshot"
          defaultProjectRoutingGetter={() => '_organisation:test-org'}
          currentProjectRoutingGetter={() => currentRouting}
          onProjectRoutingChange={onProjectRoutingChange}
        >
          <ReadPickerState onChange={onStateChange} />
          <ProjectPickerFrameHeader />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ isUsingSpaceDefaults: true })
        );
      });

      await toggleProjectListItemSwitch(user, linkedProjectOne._id);

      // the exclusion re-encodes to an explicit snapshot enumeration and leaves defaults
      await waitFor(() => {
        expect(onProjectRoutingChange).toHaveBeenLastCalledWith(
          '_organisation:test-org AND (_id:origin OR _id:linked2)'
        );
      });
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ isUsingSpaceDefaults: false })
      );

      await clickRevertToSpaceDefaults(user);

      // reverting reports the default string verbatim — not the snapshot enumeration the
      // encoder would produce — and the state registers as back on space defaults
      await waitFor(() => {
        expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_organisation:test-org');
      });
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ isUsingSpaceDefaults: true })
      );
    });

    it('becomes false when the user changes project exclusions', async () => {
      const user = userEvent.setup();
      const onStateChange = jest.fn();

      render(
        <ProjectPickerStateProvider
          {...defaultProviderProps}
          currentProjectRoutingGetter={() => PROJECT_ROUTING.ALL}
          defaultProjectRoutingGetter={() => PROJECT_ROUTING.ALL}
        >
          <ReadPickerState onChange={onStateChange} />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ isUsingSpaceDefaults: true })
        );
      });

      await toggleProjectListItemSwitch(user, linkedProjectOne._id);

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ isUsingSpaceDefaults: false })
        );
      });
    });
  });

  describe('server-backed filter search', () => {
    it('fetches on filter expression changes and not on exclusions', async () => {
      const user = userEvent.setup();
      const fetchProjectsByRouting = createFetchProjectsByRouting();
      const organisationFilter = {
        operator: FilterOperator.EQUALS,
        tagName: '_organisation',
        tagValue: 'test-org',
      } as const;

      render(
        <ProjectPickerStateProvider
          {...defaultProviderProps}
          fetchProjectsByRouting={fetchProjectsByRouting}
        >
          <AddFilterExpression expression={organisationFilter} />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      expect(fetchProjectsByRouting).not.toHaveBeenCalled();

      await user.click(screen.getByTestId('addFilterExpression'));

      await waitFor(() => {
        expect(fetchProjectsByRouting).toHaveBeenCalledWith('_organisation:test-org');
      });

      const callsAfterFilter = fetchProjectsByRouting.mock.calls.length;

      await toggleProjectListItemSwitch(user, linkedProjectOne._id);

      await waitFor(() => {
        expect(getProjectListItemSwitch(linkedProjectOne._id)).toHaveAttribute(
          'aria-checked',
          'false'
        );
      });

      expect(fetchProjectsByRouting.mock.calls.length).toBe(callsAfterFilter);
    });
  });

  describe('propose-then-commit filter state (no-flash behavior)', () => {
    it('keeps the current list and warning-free while a proposal is in flight, then applies the result atomically once it resolves', async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<ProjectsData>();
      const fetchProjectsByRouting = jest.fn(() => deferred.promise);

      renderFullProjectPicker({
        defaultProjectRoutingGetter: () => '_type:security',
        currentProjectRoutingGetter: () => '',
        fetchProjectsByRouting,
      });

      // before any change, all three catalog projects are shown and nothing warns
      expect(getProjectListItemSwitch(originProject._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectOne._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectTwo._id)).toBeInTheDocument();
      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();

      await clickRevertToSpaceDefaults(user);

      await waitFor(() => {
        expect(fetchProjectsByRouting).toHaveBeenCalledWith('_type:security');
      });

      // proposal is pending: loader is visible, previously-shown projects are still rendered
      // untouched, and the no-matches warning never flashes in the gap before the fetch resolves
      expect(screen.getByTestId('projectPickerListLoadingIndicator')).toBeInTheDocument();
      expect(getProjectListItemSwitch(originProject._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectOne._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectTwo._id)).toBeInTheDocument();
      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();

      deferred.resolve({ origin: null, linkedProjects: [linkedProjectOne] });

      await waitFor(() => {
        expect(screen.queryByTestId('projectPickerListLoadingIndicator')).not.toBeInTheDocument();
      });

      // the committed list now reflects the resolved proposal, still without ever having warned
      expect(getProjectListItemSwitch(linkedProjectOne._id)).toBeInTheDocument();
      expect(
        screen.queryByTestId(getProjectPickerListItemSwitchTestSubj(originProject._id))
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();
    });

    it('leaves the proposal and current list intact and shows an error callout when the search fails', async () => {
      const user = userEvent.setup();
      const deferred = createDeferred<ProjectsData>();
      const fetchProjectsByRouting = jest.fn(() => deferred.promise);

      renderFullProjectPicker({
        defaultProjectRoutingGetter: () => '_type:security',
        currentProjectRoutingGetter: () => '',
        fetchProjectsByRouting,
      });

      await clickRevertToSpaceDefaults(user);

      await waitFor(() => {
        expect(fetchProjectsByRouting).toHaveBeenCalledWith('_type:security');
      });

      deferred.reject(new Error('network down'));

      await waitFor(() => {
        expect(screen.getByTestId('projectPickerFilterSearchErrorCallout')).toBeInTheDocument();
      });

      // the failed proposal's filters stay visible and the previously-shown list is untouched;
      // the proposal itself is still pending (the user hasn't resolved the error yet), so the
      // "edit in progress" indicator stays up alongside the error callout
      expect(screen.getByText('_type:security')).toBeInTheDocument();
      expect(getProjectListItemSwitch(originProject._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectOne._id)).toBeInTheDocument();
      expect(getProjectListItemSwitch(linkedProjectTwo._id)).toBeInTheDocument();
      expect(screen.getByTestId('projectPickerListLoadingIndicator')).toBeInTheDocument();
      expect(
        screen.queryByTestId('projectPickerFilterDisplayNoMatchCallout')
      ).not.toBeInTheDocument();
    });
  });
});
