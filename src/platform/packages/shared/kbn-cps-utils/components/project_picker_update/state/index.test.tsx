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
import type { CPSProject } from '../../../types';
import { ProjectPickerList } from '../blocks/list/list';
import { FilterOperator, type FilterExpressionValue } from '../utils/filter_input_codec';
import {
  ProjectPickerStateProvider,
  useProjectPickerActions,
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
  defaultProjectRoutingGetter: () => '_alias:origin',
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

describe('ProjectPickerStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('projectRoutingStrategy', () => {
    describe('dynamic', () => {
      it('calls onProjectRoutingChange with a wildcard id clause on mount by default', async () => {
        const { onProjectRoutingChange } = renderProjectPicker();

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith('_id:*');
        });
      });

      it('calls onProjectRoutingChange with exclusions when a project is deselected', async () => {
        const user = userEvent.setup();
        const { onProjectRoutingChange } = renderProjectPicker({
          projectRoutingStrategy: 'dynamic',
        });

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith('_id:*');
        });

        await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:* AND NOT _id:linked1');
        });
      });

      it('includes encoded filter expressions with the wildcard id clause', async () => {
        const user = userEvent.setup();
        const onProjectRoutingChange = jest.fn();
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
          >
            <AddFilterExpression expression={securityTypeFilter} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith('_id:*');
        });

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_type:security AND _id:*');
        });
      });
    });

    describe('snapshot', () => {
      it('calls onProjectRoutingChange with explicit id clauses for selected projects', async () => {
        const { onProjectRoutingChange } = renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
        });

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith(
            '_id:origin AND _id:linked1 AND _id:linked2'
          );
        });
      });

      it('omits deselected projects from the explicit id clauses', async () => {
        const user = userEvent.setup();
        const { onProjectRoutingChange } = renderProjectPicker({
          projectRoutingStrategy: 'snapshot',
        });

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith(
            '_id:origin AND _id:linked1 AND _id:linked2'
          );
        });

        await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:origin AND _id:linked2');
        });
      });

      it('includes encoded filter expressions with explicit id clauses for selected projects', async () => {
        const user = userEvent.setup();
        const onProjectRoutingChange = jest.fn();
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
          >
            <AddFilterExpression expression={securityTypeFilter} />
            <ProjectPickerList />
          </ProjectPickerStateProvider>
        );

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenCalledWith(
            '_id:origin AND _id:linked1 AND _id:linked2'
          );
        });

        await user.click(screen.getByTestId('addFilterExpression'));

        await waitFor(() => {
          expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_type:security AND _id:linked1');
        });
      });
    });
  });
});
