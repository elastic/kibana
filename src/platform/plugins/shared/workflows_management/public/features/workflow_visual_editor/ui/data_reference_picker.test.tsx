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

const makeItems = (prefix: string, count: number, originLabel: string) =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}.f${i}`,
    label: `f${i}`,
    subtitle: `${prefix}.f${i}`,
    typeLabel: 'string',
    drillable: false as const,
    originLabel,
  }));

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'triggers',
      title: 'Trigger event',
      description: 'Data from this workflow\'s trigger.',
      items: makeItems('event', 7, 'Trigger · Manual'),
    },
    {
      id: 'steps',
      title: 'Steps',
      description: 'Prior steps',
      items: makeItems('steps.a.output', 3, 'Step · a'),
      emptyMessage: 'No earlier steps',
    },
    {
      id: 'context',
      title: 'Workflow context',
      description: 'Constants and runtime',
      items: makeItems('context', 2, 'Workflow context'),
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

    const triggersGroup = screen.getByTestId('workflowDataReferenceGroup-triggers');
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);
    expect(screen.getByTestId('workflowDataReferenceShowAll-triggers')).toHaveTextContent(
      'Show all (7)'
    );

    const stepsGroup = screen.getByTestId('workflowDataReferenceGroup-steps');
    expect(within(stepsGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(3);
    expect(screen.queryByTestId('workflowDataReferenceShowAll-steps')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-triggers'));
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(7);
    expect(screen.getByTestId('workflowDataReferenceShowAll-triggers')).toHaveTextContent(
      'Show fewer'
    );

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-triggers'));
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);

    fireEvent.change(screen.getByTestId('workflowDataReferenceSearch'), {
      target: { value: 'event.f' },
    });
    // Search lists all matching leaves — no per-group cap.
    expect(screen.getAllByTestId(/workflowDataReferenceRow-event\.f/)).toHaveLength(7);
    expect(
      screen.queryByTestId('workflowDataReferenceShowAll-triggers')
    ).not.toBeInTheDocument();
  });

  it('does not render jump-link chips', () => {
    renderOpen();
    expect(screen.queryByTestId('workflowDataReferenceJumpLinks')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowDataReferenceJump-triggers')).not.toBeInTheDocument();
  });
});
