/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { DataReferenceCatalogTree } from './data_reference_catalog_tree';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { StepOutputSamples } from '../model/use_step_output_samples';
import { useStepOutputSamples } from '../model/use_step_output_samples';

jest.mock('../model/use_step_output_samples', () => ({
  useStepOutputSamples: jest.fn(),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mocked-step-icon" />,
}));

const mockUseStepOutputSamples = jest.mocked(useStepOutputSamples);

const originLabel = 'Step · first';
const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'steps',
      title: 'Steps',
      description: 'Earlier steps',
      items: [
        {
          path: 'steps.first.output',
          label: 'first',
          typeLabel: 'object',
          drillable: true,
          isEntity: true,
          stepName: 'first',
          originLabel,
          children: [
            {
              path: 'steps.first.output.status',
              label: 'status',
              typeLabel: 'string',
              drillable: false,
              originLabel,
            },
          ],
        },
      ],
    },
  ],
};

const noSamples: StepOutputSamples = { byStep: {}, isFullRunInProgress: false };

describe('DataReferenceCatalogTree run controls', () => {
  const onRunStep = jest.fn();
  const onRunWorkflow = jest.fn();

  const renderTree = (props: Partial<React.ComponentProps<typeof DataReferenceCatalogTree>> = {}) =>
    render(
      <I18nProvider>
        <DataReferenceCatalogTree
          catalog={catalog}
          onInsert={jest.fn()}
          onRunStep={onRunStep}
          onRunWorkflow={onRunWorkflow}
          {...props}
        />
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStepOutputSamples.mockReturnValue(noSamples);
  });

  it('shows no run controls without run callbacks', () => {
    renderTree({ onRunStep: undefined, onRunWorkflow: undefined });

    expect(screen.queryByTestId('workflowDataReferenceTreeRun-steps.first.output')).toBeNull();
    expect(screen.queryByTestId('workflowDataReferenceTreeRunWorkflow')).toBeNull();
  });

  it('runs a step without upstream references directly', () => {
    renderTree({ canRunStepDirectly: () => true });

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRun-steps.first.output'));

    expect(onRunStep).toHaveBeenCalledWith('first');
    expect(
      screen.queryByTestId('workflowDataReferenceTreeRunCustom-steps.first.output')
    ).toBeNull();
  });

  it('lets the user choose how to run a step that needs upstream data', () => {
    renderTree({ canRunStepDirectly: () => false });

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRun-steps.first.output'));
    expect(onRunStep).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRunCustom-steps.first.output'));
    expect(onRunStep).toHaveBeenCalledWith('first');
    expect(onRunWorkflow).not.toHaveBeenCalled();
  });

  it('offers to run the full workflow and says it also runs the later steps', () => {
    renderTree({ canRunStepDirectly: () => false });

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRun-steps.first.output'));
    expect(
      screen.getByText('Runs every step, including the ones after this step.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRunFull-steps.first.output'));
    expect(onRunWorkflow).toHaveBeenCalledTimes(1);
    expect(onRunStep).not.toHaveBeenCalled();
  });

  it('runs the full workflow from the steps header', () => {
    renderTree();

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRunWorkflow'));

    expect(onRunWorkflow).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner in the header while a full run is in progress', () => {
    mockUseStepOutputSamples.mockReturnValue({ byStep: {}, isFullRunInProgress: true });
    renderTree();

    expect(screen.getByTestId('workflowDataReferenceTreeRunWorkflowSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowDataReferenceTreeRunWorkflow')).toBeNull();
  });

  it('shows a spinner on a step while its run is going', () => {
    mockUseStepOutputSamples.mockReturnValue({
      byStep: { first: { status: 'running' } },
      isFullRunInProgress: false,
    });
    renderTree();

    expect(
      screen.getByTestId('workflowDataReferenceTreeRunSpinner-steps.first.output')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('workflowDataReferenceTreeRun-steps.first.output')).toBeNull();
  });

  it('shows the failure of a step and runs it again when clicked', () => {
    mockUseStepOutputSamples.mockReturnValue({
      byStep: { first: { status: 'error', errorMessage: 'boom' } },
      isFullRunInProgress: false,
    });
    renderTree({ canRunStepDirectly: () => true });

    const errorButton = screen.getByTestId('workflowDataReferenceTreeRunError-steps.first.output');
    expect(errorButton).toHaveAttribute('aria-label', 'boom');

    fireEvent.click(errorButton);
    expect(onRunStep).toHaveBeenCalledWith('first');
  });

  it('only asks for the data of steps that are expanded', () => {
    renderTree();
    expect(mockUseStepOutputSamples).toHaveBeenLastCalledWith(
      expect.objectContaining({ stepNames: [] })
    );

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRow-entity:steps.first.output'));

    expect(mockUseStepOutputSamples).toHaveBeenLastCalledWith(
      expect.objectContaining({ stepNames: ['first'] })
    );
  });

  it('asks for the data of a step with a run started from the tree even when collapsed', () => {
    renderTree({ treeRuns: [{ executionId: 'exec-1', stepId: 'first' }] });

    expect(mockUseStepOutputSamples).toHaveBeenLastCalledWith(
      expect.objectContaining({ stepNames: ['first'] })
    );
  });

  it('shows the last run values on the expanded step', () => {
    mockUseStepOutputSamples.mockReturnValue({
      byStep: { first: { status: 'done', output: { status: 'ok', extra: 7 } } },
      isFullRunInProgress: false,
    });
    renderTree();

    fireEvent.click(screen.getByTestId('workflowDataReferenceTreeRow-entity:steps.first.output'));

    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
