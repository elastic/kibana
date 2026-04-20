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

jest.mock('../lib/get_action_options', () => ({
  getActionOptions: jest.fn().mockReturnValue([]),
  flattenOptions: jest.fn().mockReturnValue([]),
}));

import { ActionsMenu } from './actions_menu';
import type { EditorCommand, JumpToStepEntry } from '../types';

const mockCommands: EditorCommand[] = [
  { id: 'foldAll', label: 'Collapse all', iconType: 'minusInCircle' },
  { id: 'unfoldAll', label: 'Expand all', iconType: 'plusInCircle' },
  { id: 'find', label: 'Find and Replace', iconType: 'search' },
];

const mockSteps: JumpToStepEntry[] = [
  { id: 'step_one', label: '#step_one', lineStart: 5 },
  { id: 'step_two', label: '#step_two', lineStart: 15 },
  { id: 'alert_step', label: '#alert_step', lineStart: 25 },
];

describe('ActionsMenu - Commands and Jump to Step sections', () => {
  const onActionSelected = jest.fn();
  const onCommandSelected = jest.fn();
  const onJumpToStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
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

  it('shows jump-to-step entries when search matches step names', () => {
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
    fireEvent.change(searchInput, { target: { value: 'step' } });

    expect(screen.getByText('Jump to a step')).toBeInTheDocument();
    expect(screen.getByTitle('#step_one')).toBeInTheDocument();
    expect(screen.getByTitle('#step_two')).toBeInTheDocument();
  });

  it('shows all jump entries when searching with # prefix', () => {
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
    fireEvent.change(searchInput, { target: { value: '#' } });

    expect(screen.getByText('Jump to a step')).toBeInTheDocument();
    expect(screen.getByTitle('#step_one')).toBeInTheDocument();
    expect(screen.getByTitle('#step_two')).toBeInTheDocument();
    expect(screen.getByTitle('#alert_step')).toBeInTheDocument();
    expect(screen.queryByText('Commands')).not.toBeInTheDocument();
    expect(screen.queryByText('Add step')).not.toBeInTheDocument();
  });

  it('filters jump entries with # prefix search', () => {
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
    fireEvent.change(searchInput, { target: { value: '#alert' } });

    expect(screen.getByTitle('#alert_step')).toBeInTheDocument();
    expect(screen.queryByTitle('#step_one')).not.toBeInTheDocument();
    expect(screen.queryByTitle('#step_two')).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByTitle('#step_two'));
    expect(onJumpToStep).toHaveBeenCalledWith(15);
  });

  it('does not render sections when no commands or steps are provided', () => {
    render(<ActionsMenu onActionSelected={onActionSelected} />, { wrapper: Wrapper });

    expect(screen.queryByText('Commands')).not.toBeInTheDocument();
    expect(screen.queryByText('Jump to a step')).not.toBeInTheDocument();
  });

  it('shows "View all existing steps" when search matches some but not all steps', () => {
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
    fireEvent.change(searchInput, { target: { value: 'alert' } });

    expect(screen.getByTitle('#alert_step')).toBeInTheDocument();
    expect(screen.getByTitle('View all existing steps')).toBeInTheDocument();
  });

  it('does not show "View all existing steps" when all steps match', () => {
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
    fireEvent.change(searchInput, { target: { value: 'step' } });

    expect(screen.queryByTitle('View all existing steps')).not.toBeInTheDocument();
  });

  it('clicking "View all existing steps" switches to # mode', () => {
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
    fireEvent.change(searchInput, { target: { value: 'alert' } });

    fireEvent.click(screen.getByTitle('View all existing steps'));

    expect((searchInput as HTMLInputElement).value).toBe('#');
    expect(screen.getByTitle('#step_one')).toBeInTheDocument();
    expect(screen.getByTitle('#step_two')).toBeInTheDocument();
    expect(screen.getByTitle('#alert_step')).toBeInTheDocument();
  });
});
