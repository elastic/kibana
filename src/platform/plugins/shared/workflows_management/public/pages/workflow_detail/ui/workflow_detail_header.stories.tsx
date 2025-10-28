/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Decorator, StoryContext, StoryObj } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { useDispatch } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import {
  _setComputedDataInternal,
  setWorkflow,
  setYamlString,
  WorkflowDetailStoreProvider,
} from '../../../widgets/workflow_yaml_editor/lib/store';
import type { AppDispatch } from '../../../widgets/workflow_yaml_editor/lib/store/store';

const defaultWorkflow: WorkflowDetailDto = {
  id: 'test-workflow-123',
  name: 'New workflow',
  description: 'New workflow',
  enabled: true,
  yaml: ``,
  definition: {
    version: '1',
    name: 'New workflow',
    enabled: true,
    triggers: [],
    steps: [],
  },
  valid: true,
  createdAt: moment().subtract(1, 'hour').toISOString(),
  lastUpdatedAt: moment().subtract(1, 'hour').toISOString(),
  createdBy: 'test-user',
  lastUpdatedBy: 'test-user',
};

/**
 * Inner component that can access the Redux store
 */
const StoryWrapper: React.FC<{
  story: () => React.ReactElement;
  initialDispatch?: (dispatch: AppDispatch) => void;
}> = ({ story, initialDispatch }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Execute initialDispatch if provided
  React.useEffect(() => {
    dispatch(setWorkflow(defaultWorkflow));
    dispatch(_setComputedDataInternal({ workflowDefinition: defaultWorkflow.definition }));
    initialDispatch?.(dispatch);
  }, [dispatch, initialDispatch]);

  return story();
};

const StoryProviders: Decorator = (story, { parameters }: StoryContext) => {
  const initialDispatch = parameters?.initialDispatch as
    | ((dispatch: AppDispatch) => void)
    | undefined;

  return (
    <WorkflowDetailStoreProvider>
      <MemoryRouter initialEntries={['/test-123']}>
        <Routes>
          <Route
            path="/:id"
            render={() => <StoryWrapper story={story} initialDispatch={initialDispatch} />}
          />
        </Routes>
      </MemoryRouter>
    </WorkflowDetailStoreProvider>
  );
};

export default {
  component: WorkflowDetailHeader,
  title: 'Workflows Management/Workflow Detail Header',
  decorators: [kibanaReactDecorator, StoryProviders],
};

type Story = StoryObj<typeof WorkflowDetailHeader>;

export const Default: Story = {
  args: {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
  },
};

export const JustNow: Story = {
  args: {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
  },
  parameters: {
    initialDispatch: (dispatch: AppDispatch) => {
      dispatch(
        setWorkflow({
          ...defaultWorkflow,
          lastUpdatedAt: moment().subtract(1, 'second').toISOString(),
        })
      );
    },
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    highlightDiff: false,
    setHighlightDiff: () => {},
  },
};

export const LongTitle: Story = {
  args: {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
  },
  parameters: {
    initialDispatch: (dispatch: AppDispatch) => {
      dispatch(
        setWorkflow({
          ...defaultWorkflow,
          name: 'A very long workflow name that should be truncated',
        })
      );
    },
  },
};

export const UnsavedChanges: Story = {
  args: {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: () => {},
  },
  parameters: {
    initialDispatch: (dispatch: AppDispatch) => {
      // Example: Set a YAML string to simulate unsaved changes
      dispatch(
        setYamlString(
          `name: Example Workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: test-step
    type: console
    with:
      message: "Hello World"`
        )
      );
    },
  },
};
