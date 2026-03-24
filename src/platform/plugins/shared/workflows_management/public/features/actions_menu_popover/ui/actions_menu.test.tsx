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
import { ActionsMenu } from './actions_menu';
import type { ActionGroup, ActionOption, ActionOptionData } from '../types';

jest.mock('../../../hooks/use_kibana');

const mockLeafOption: ActionOption = {
  id: 'manual',
  label: 'Manual',
  description: 'Trigger - Manually start from the UI',
  iconType: 'play',
  iconColor: 'success',
};

const mockLeafOption2: ActionOption = {
  id: 'alert',
  label: 'Alert',
  description: 'Trigger - When an alert from rule is created',
  iconType: 'bell',
  iconColor: '#6092C0',
};

const mockGroup: ActionGroup = {
  id: 'triggers',
  label: 'Triggers',
  description: 'Choose which event starts a workflow',
  iconType: 'bolt',
  iconColor: '#6092C0',
  options: [mockLeafOption, mockLeafOption2],
};

const mockFlowControlOption: ActionOption = {
  id: 'if',
  label: 'If Condition',
  description: 'Define condition with KQL to execute the action',
  iconType: 'branch',
  iconColor: '#54B399',
};

const mockOptions: ActionOptionData[] = [mockGroup, mockFlowControlOption];

jest.mock('../lib/get_action_options', () => ({
  getActionOptions: jest.fn(() => mockOptions),
  flattenOptions: jest.fn((options: ActionOptionData[]) => {
    const flat: ActionOptionData[] = [];
    const flatten = (items: ActionOptionData[]) => {
      for (const item of items) {
        flat.push(item);
        if ('options' in item) {
          flatten(item.options);
        }
      }
    };
    flatten(options);
    return flat;
  }),
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mocked-step-icon" />,
}));

const renderComponent = (props = {}) =>
  render(
    <I18nProvider>
      <ActionsMenu onActionSelected={jest.fn()} {...props} />
    </I18nProvider>
  );

describe('ActionsMenu', () => {
  it('renders the title "Select an action"', () => {
    renderComponent();
    expect(screen.getByText('Select an action')).toBeInTheDocument();
  });

  it('renders top-level options', () => {
    renderComponent();
    expect(screen.getByText('Triggers')).toBeInTheDocument();
    expect(screen.getByText('If Condition')).toBeInTheDocument();
  });

  it('renders option descriptions', () => {
    renderComponent();
    expect(screen.getByText('Choose which event starts a workflow')).toBeInTheDocument();
    expect(screen.getByText('Define condition with KQL to execute the action')).toBeInTheDocument();
  });

  it('calls onActionSelected when a leaf option is clicked', () => {
    const onActionSelected = jest.fn();
    renderComponent({ onActionSelected });

    // EuiSelectable renders options with role="option"
    const options = screen.getAllByRole('option');
    // Click the "If Condition" option (second in the list)
    const ifOption = options.find((opt) => opt.textContent?.includes('If Condition'));
    expect(ifOption).toBeDefined();
    fireEvent.click(ifOption!);

    expect(onActionSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'if', label: 'If Condition' })
    );
  });

  it('navigates into a group when a group option is clicked', () => {
    renderComponent();

    // EuiSelectable renders options with role="option"
    const options = screen.getAllByRole('option');
    const triggersOption = options.find((opt) => opt.textContent?.includes('Triggers'));
    expect(triggersOption).toBeDefined();
    fireEvent.click(triggersOption!);

    // Should now show the child options
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    // Should show a Back button
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('navigates back from a group when Back button is clicked', () => {
    renderComponent();

    // Navigate into the group
    const options = screen.getAllByRole('option');
    const triggersOption = options.find((opt) => opt.textContent?.includes('Triggers'));
    fireEvent.click(triggersOption!);
    expect(screen.getByText('Back')).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText('Back'));

    // Should show top-level options again
    expect(screen.getByText('Select an action')).toBeInTheDocument();
    expect(screen.getByText('Triggers')).toBeInTheDocument();
    expect(screen.getByText('If Condition')).toBeInTheDocument();
  });

  it('calls onActionSelected when a child leaf option is selected within a group', () => {
    const onActionSelected = jest.fn();
    renderComponent({ onActionSelected });

    // Navigate into "Triggers"
    const options = screen.getAllByRole('option');
    const triggersOption = options.find((opt) => opt.textContent?.includes('Triggers'));
    fireEvent.click(triggersOption!);

    // Select "Manual" from the sub-options
    const childOptions = screen.getAllByRole('option');
    const manualOption = childOptions.find((opt) => opt.textContent?.includes('Manual'));
    expect(manualOption).toBeDefined();
    fireEvent.click(manualOption!);

    expect(onActionSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'manual', label: 'Manual' })
    );
  });

  it('renders a search input', () => {
    renderComponent();
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
  });
});
