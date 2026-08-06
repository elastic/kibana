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
import userEvent from '@testing-library/user-event';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../../types';
import { ProjectPickerList } from '../blocks/list/list';
import { FilterOperator, type FilterExpressionValue } from '../utils/filter_input_codec';
import {
  ProjectPickerStateProvider,
  useProjectPickerActions,
  useProjectPickerState,
  type ProjectPickerStateProviderProps,
} from '.';

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

const defaultProviderProps: Omit<ProjectPickerStateProviderProps, 'children'> = {
  availableProjects,
  originProjectId: originProject._id,
  defaultProjectRoutingGetter: () => '',
  currentProjectRoutingGetter: () => '',
  onProjectRoutingChange: jest.fn(),
};

const renderProjectPicker = (
  props: Partial<Omit<ProjectPickerStateProviderProps, 'children'>> = {}
) => {
  const onProjectRoutingChange = props.onProjectRoutingChange ?? jest.fn();

  render(
    <ProjectPickerStateProvider
      {...defaultProviderProps}
      {...props}
      onProjectRoutingChange={onProjectRoutingChange}
    >
      <ProjectPickerList />
    </ProjectPickerStateProvider>
  );

  return { onProjectRoutingChange };
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
        const { onProjectRoutingChange } = renderProjectPicker();

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

        await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

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
      it('calls onProjectRoutingChange with clauses for all projects when there are no exclusions', async () => {
        const onProjectRoutingChange = jest.fn();
        renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
          onProjectRoutingChange,
        });

        expect(onProjectRoutingChange).toHaveBeenCalledWith(
          '_id:origin AND _id:linked1 AND _id:linked2'
        );
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

        await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin AND _id:linked2');
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

        expect(onProjectRoutingChange).toHaveBeenCalledWith(
          '_id:origin AND _id:linked1 AND _id:linked2'
        );

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          // the _type:security clause is added to the filter expression, which excludes project with id linked2
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_type:security AND _id:linked1');
        });
      });
    });
  });

  describe('isUsingSpaceDefaults', () => {
    it('is true on mount when current routing matches the default', async () => {
      const onStateChange = jest.fn();

      render(
        <ProjectPickerStateProvider {...defaultProviderProps}>
          <ReadPickerState onChange={onStateChange} />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            currentProjectRouting: '',
            isUsingSpaceDefaults: true,
          })
        );
      });
    });

    it('becomes false when the user changes project exclusions', async () => {
      const user = userEvent.setup();
      const onStateChange = jest.fn();

      render(
        <ProjectPickerStateProvider {...defaultProviderProps}>
          <ReadPickerState onChange={onStateChange} />
          <ProjectPickerList />
        </ProjectPickerStateProvider>
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ isUsingSpaceDefaults: true })
        );
      });

      await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

      await waitFor(() => {
        expect(onStateChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ isUsingSpaceDefaults: false })
        );
      });
    });
  });
});
