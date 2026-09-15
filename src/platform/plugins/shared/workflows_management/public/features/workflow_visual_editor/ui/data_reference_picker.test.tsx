/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { DataReferencePicker } from './data_reference_picker';

jest.mock('@kbn/react-field', () => ({
  FieldIcon: () => <span data-test-subj="mocked-field-icon" />,
}));

const makeItems = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}.f${i}`,
    typeLabel: 'string',
    drillable: false as const,
  }));

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'event',
      title: 'Trigger event',
      items: makeItems('event', 7),
    },
    {
      id: 'steps',
      title: 'Steps',
      items: makeItems('steps.a.output', 3),
    },
    {
      id: 'context',
      title: 'Workflow context',
      items: makeItems('context', 2),
    },
  ],
};

const renderOpen = () => {
  const onInsert = jest.fn();
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <DataReferencePicker
        catalog={catalog}
        isOpen
        onClose={onClose}
        onInsert={onInsert}
        input={<input data-test-subj="anchor" />}
      />
    </I18nProvider>
  );
  return { onInsert, onClose };
};

describe('DataReferencePicker scaling', () => {
  it('caps root groups at 5 rows with Show all / Show fewer; search is uncapped', () => {
    renderOpen();

    const eventGroup = screen.getByTestId('workflowDataReferenceGroup-event');
    expect(within(eventGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);
    expect(screen.getByTestId('workflowDataReferenceShowAll-event')).toHaveTextContent(
      'Show all (7)'
    );

    const stepsGroup = screen.getByTestId('workflowDataReferenceGroup-steps');
    expect(within(stepsGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(3);
    expect(screen.queryByTestId('workflowDataReferenceShowAll-steps')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-event'));
    expect(within(eventGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(7);
    expect(screen.getByTestId('workflowDataReferenceShowAll-event')).toHaveTextContent(
      'Show fewer'
    );

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-event'));
    expect(within(eventGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);

    fireEvent.change(screen.getByTestId('workflowDataReferenceSearch'), {
      target: { value: 'event.f' },
    });
    // Search lists all matching leaves — no per-group cap.
    expect(screen.getAllByTestId(/workflowDataReferenceRow-event\.f/)).toHaveLength(7);
    expect(screen.queryByTestId('workflowDataReferenceShowAll-event')).not.toBeInTheDocument();
  });

  it('renders jump chips for present groups only and keeps them keyboard-reachable', () => {
    renderOpen();

    const jumps = screen.getByTestId('workflowDataReferenceJumpLinks');
    expect(within(jumps).getByTestId('workflowDataReferenceJump-event')).toHaveTextContent(
      'Trigger'
    );
    expect(within(jumps).getByTestId('workflowDataReferenceJump-steps')).toHaveTextContent(
      'Steps'
    );
    expect(within(jumps).getByTestId('workflowDataReferenceJump-context')).toHaveTextContent(
      'Context'
    );
    expect(within(jumps).queryByTestId('workflowDataReferenceJump-consts')).not.toBeInTheDocument();

    const triggerChip = within(jumps).getByTestId('workflowDataReferenceJump-event');
    expect(triggerChip.tagName).toBe('BUTTON');
    triggerChip.focus();
    expect(triggerChip).toHaveFocus();
  });
});
