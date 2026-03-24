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
import { IntlProvider } from '@kbn/i18n-react';
import type { EditorCommand, JumpToStepEntry } from './actions_menu';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      workflowsExtensions: {
        getStepDefinition: jest.fn(),
        getRegisteredSteps: jest.fn().mockReturnValue([]),
      },
    },
  }),
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => null,
}));

jest.mock('../../../trigger_schemas', () => ({
  triggerSchemas: {
    getTriggerDefinitions: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('../../../../common/schema', () => ({
  getAllConnectors: jest.fn().mockReturnValue([]),
}));

const { ActionsMenu } = jest.requireActual('./actions_menu');

const mockCommands: EditorCommand[] = [
  { id: 'foldAll', label: 'Collapse all' },
  { id: 'unfoldAll', label: 'Expand all' },
  { id: 'find', label: 'Find and Replace' },
];

const mockSteps: JumpToStepEntry[] = [
  { id: 'step_one', label: '#step_one', lineStart: 5 },
  { id: 'step_two', label: '#step_two', lineStart: 15 },
];

describe('ActionsMenu - Commands and Jump to Step sections', () => {
  const onActionSelected = jest.fn();
  const onCommandSelected = jest.fn();
  const onJumpToStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en">{children}</IntlProvider>
  );

  it('renders commands section on initial open (no search)', () => {
    render(
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={mockCommands}
        jumpToStepEntries={mockSteps}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('Collapse all')).toBeInTheDocument();
    expect(screen.queryByText('Jump to a step')).not.toBeInTheDocument();
  });

  it('calls onCommandSelected when a command is clicked', () => {
    render(
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={mockCommands}
        jumpToStepEntries={mockSteps}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByText('Collapse all'));
    expect(onCommandSelected).toHaveBeenCalledWith('foldAll');
  });

  it('shows jump-to-step entries only when search starts with #', () => {
    render(
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={mockCommands}
        jumpToStepEntries={mockSteps}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.queryByText('Jump to a step')).not.toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: '#' } });

    expect(screen.getByText('Jump to a step')).toBeInTheDocument();
    expect(screen.getByText('#step_one')).toBeInTheDocument();
    expect(screen.getByText('#step_two')).toBeInTheDocument();
  });

  it('calls onJumpToStep with correct line when a step entry is clicked', () => {
    render(
      <ActionsMenu
        onActionSelected={onActionSelected}
        commands={mockCommands}
        jumpToStepEntries={mockSteps}
        onCommandSelected={onCommandSelected}
        onJumpToStep={onJumpToStep}
      />,
      { wrapper: Wrapper }
    );

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: '#step' } });

    fireEvent.click(screen.getByText('#step_two'));
    expect(onJumpToStep).toHaveBeenCalledWith(15);
  });

  it('does not render sections when no commands or steps are provided', () => {
    render(<ActionsMenu onActionSelected={onActionSelected} />, { wrapper: Wrapper });

    expect(screen.queryByText('Commands')).not.toBeInTheDocument();
    expect(screen.queryByText('Jump to a step')).not.toBeInTheDocument();
  });
});
