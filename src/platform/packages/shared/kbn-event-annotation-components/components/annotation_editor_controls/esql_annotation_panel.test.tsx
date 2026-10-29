/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import { ConfigPanelEsqlAnnotation } from './esql_annotation_panel';

const columns: DatatableColumn[] = [
  { id: 'start-id', name: 'start', meta: { type: 'date' } },
  { id: 'end-id', name: 'end', meta: { type: 'date' } },
  { id: 'version-id', name: 'version', meta: { type: 'string' } },
  { id: 'duration-id', name: 'duration', meta: { type: 'number' } },
];

const annotation: EsqlEventAnnotationConfig = {
  id: 'deployments',
  type: 'esql',
  query: { esql: 'FROM deployments | KEEP start, end, version, duration' },
  key: { type: 'point_in_time' },
  timeColumn: 'start',
  textColumn: 'version',
  extraColumns: ['duration'],
  label: 'Deployments',
  color: '#FF0000',
  icon: 'triangle',
  lineStyle: 'dashed',
  lineWidth: 3,
  textVisibility: true,
};

const renderPanel = (
  currentAnnotation: EsqlEventAnnotationConfig = annotation,
  resultColumns = columns
) => {
  const onChange = jest.fn();
  const rendered = render(
    <ConfigPanelEsqlAnnotation
      annotation={currentAnnotation}
      columns={resultColumns}
      onChange={onChange}
      queryEditor={<div data-test-subj="annotation-query-editor" />}
    />
  );
  return { ...rendered, onChange };
};

describe('ConfigPanelEsqlAnnotation', () => {
  it('renders the supplied editor and restricts time selections to date result columns', () => {
    renderPanel();

    expect(screen.getByTestId('annotation-query-editor')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Time column'))
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['Select a column', 'start', 'end']);
    expect(
      within(screen.getByLabelText('Text column'))
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['None', 'start', 'end', 'version', 'duration']);
    expect(screen.queryByLabelText('End time column')).not.toBeInTheDocument();
  });

  it('uses result names rather than datatable IDs and preserves the query and appearance', () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Time column'), { target: { value: 'end' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...annotation, timeColumn: 'end' });

    fireEvent.change(screen.getByLabelText('Text column'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...annotation, textColumn: undefined });
  });

  it('edits the end column of a range without changing its fill or query', () => {
    const range: EsqlEventAnnotationConfig = {
      id: 'maintenance',
      type: 'esql',
      query: annotation.query,
      key: { type: 'range' },
      timeColumn: 'start',
      endTimeColumn: 'end',
      label: 'Maintenance',
      color: '#FF00001A',
      outside: true,
    };
    const { onChange } = renderPanel(range);

    fireEvent.change(screen.getByLabelText('End time column'), { target: { value: 'start' } });
    expect(onChange).toHaveBeenCalledWith({ ...range, endTimeColumn: 'start' });
  });

  it('adds tooltip columns without changing the existing configuration', async () => {
    const { onChange } = renderPanel();

    await userEvent.click(screen.getByRole('combobox', { name: 'Tooltip columns' }));
    await userEvent.click(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'version' })
    );

    expect(onChange).toHaveBeenCalledWith({ ...annotation, extraColumns: ['duration', 'version'] });
  });

  it('retains missing bindings and reports errors instead of choosing another column', () => {
    const { onChange } = renderPanel(annotation, [columns[1]]);

    expect(screen.getByLabelText('Time column')).toHaveValue('start');
    expect(screen.getByLabelText('Time column')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Text column')).toHaveValue('version');
    expect(screen.getByText('duration')).toBeInTheDocument();
    expect(screen.getAllByText(/is missing or has an incompatible type/)).toHaveLength(3);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports an incompatible time column even when the result still contains its name', () => {
    renderPanel(annotation, [{ ...columns[0], meta: { type: 'number' } }, ...columns.slice(1)]);

    expect(screen.getByLabelText('Time column')).toHaveValue('start');
    expect(screen.getByLabelText('Time column')).toHaveAttribute('aria-invalid', 'true');
  });
});
