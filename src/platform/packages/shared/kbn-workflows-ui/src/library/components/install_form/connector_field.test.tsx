/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ConnectorField } from './connector_field';
import { WorkflowsUiServicesProvider } from '../../../context';
import { createMockWorkflowsUiServices } from '../../../context/__mocks__/mocks';

const mockUseConnectors = jest.fn();
const mockInvalidateConnectors = jest.fn();
jest.mock('../../hooks/use_connectors', () => ({
  useConnectors: (connectorType: string) => mockUseConnectors(connectorType),
  useInvalidateConnectors: () => mockInvalidateConnectors,
}));

// The icon resolution pipeline is covered by TypeIcon's own tests.
jest.mock('../../../components', () => ({
  ...jest.requireActual('../../../components'),
  TypeIcon: ({ type }: { type: string }) => <span data-test-subj={`mockTypeIcon-${type}`} />,
}));

const CONNECTORS = [
  { id: 'c-1', name: 'Team Slack', actionTypeId: '.slack' },
  { id: 'c-2', name: 'Ops Slack', actionTypeId: '.slack' },
];

describe('ConnectorField', () => {
  let onChange: jest.Mock;
  let services: ReturnType<typeof createMockWorkflowsUiServices>;

  const renderField = (value?: string) =>
    render(
      <WorkflowsUiServicesProvider services={services}>
        <ConnectorField
          connectorType=".slack"
          value={value}
          onChange={onChange}
          data-test-subj="connectorField"
        />
      </WorkflowsUiServicesProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    onChange = jest.fn();
    services = createMockWorkflowsUiServices();
    mockUseConnectors.mockReturnValue({ data: CONNECTORS, isLoading: false });
    services.triggersActionsUi.getAddConnectorFlyout = jest
      .fn()
      .mockReturnValue(<div data-test-subj="mockAddConnectorFlyout" />);
  });

  it('should prepend the connector type icon to the control', () => {
    renderField();

    expect(screen.getByTestId('mockTypeIcon-.slack')).toBeInTheDocument();
  });

  it('should list the existing connectors of the type plus a create-new option', () => {
    renderField();

    fireEvent.click(screen.getByTestId('connectorField'));

    expect(mockUseConnectors).toHaveBeenCalledWith('.slack');
    expect(screen.getByTestId('connectorField-option-c-1')).toHaveTextContent('Team Slack');
    expect(screen.getByTestId('connectorField-option-c-2')).toHaveTextContent('Ops Slack');
    expect(screen.getByTestId('connectorField-createNew')).toHaveTextContent(
      'Create a new connector'
    );
  });

  it('should call onChange with the picked connector id', () => {
    renderField();

    fireEvent.click(screen.getByTestId('connectorField'));
    fireEvent.click(screen.getByTestId('connectorField-option-c-2'));

    expect(onChange).toHaveBeenCalledWith('c-2');
  });

  it('should open the create-connector flyout scoped to the connector type', () => {
    renderField();

    fireEvent.click(screen.getByTestId('connectorField'));
    fireEvent.click(screen.getByTestId('connectorField-createNew'));

    expect(screen.getByTestId('mockAddConnectorFlyout')).toBeInTheDocument();
    expect(services.triggersActionsUi.getAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ initialConnector: { actionTypeId: '.slack' } })
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should auto-select a newly created connector and refresh the list', () => {
    renderField();

    fireEvent.click(screen.getByTestId('connectorField'));
    fireEvent.click(screen.getByTestId('connectorField-createNew'));

    const { onConnectorCreated } = (services.triggersActionsUi.getAddConnectorFlyout as jest.Mock)
      .mock.calls[0][0];
    act(() => {
      onConnectorCreated({ id: 'c-new', name: 'New Slack', actionTypeId: '.slack' });
    });

    expect(onChange).toHaveBeenCalledWith('c-new');
    expect(mockInvalidateConnectors).toHaveBeenCalled();
    // The flyout is unmounted after creation.
    expect(screen.queryByTestId('mockAddConnectorFlyout')).toBeNull();
  });
});
