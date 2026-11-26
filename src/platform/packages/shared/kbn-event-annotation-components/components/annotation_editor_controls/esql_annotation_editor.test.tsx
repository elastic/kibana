/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type {
  EventAnnotationConfig,
  EsqlEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import AnnotationEditorControls from './annotation_editor_controls';
import { ConfigPanelEsqlAnnotation } from './esql_annotation_panel';

const annotation: EsqlEventAnnotationConfig = {
  id: 'deployments',
  type: 'esql',
  query: { esql: 'FROM deployments | KEEP start, end, version' },
  key: { type: 'point_in_time' },
  timeColumn: 'start',
  textColumn: 'version',
  extraColumns: ['version'],
  label: 'Deployments',
  color: '#FF0000',
  icon: 'triangle',
  lineStyle: 'dashed',
  lineWidth: 3,
};

const columns: DatatableColumn[] = [
  { id: 'start-id', name: 'start', meta: { type: 'date' } },
  { id: 'end-id', name: 'end', meta: { type: 'date' } },
  { id: 'version-id', name: 'version', meta: { type: 'string' } },
];

const renderEditor = (currentAnnotation: EventAnnotationConfig = annotation) => {
  const onAnnotationChange = jest.fn();
  render(
    <AnnotationEditorControls
      annotation={currentAnnotation}
      onAnnotationChange={onAnnotationChange}
      getDefaultRangeEnd={() => '2026-01-02T00:00:00Z'}
      queryInputServices={{} as QueryInputServices}
      appName="lens"
      hideQueryBasedControls
      esql={{
        columns,
        renderControls: (current, onChange) => (
          <ConfigPanelEsqlAnnotation
            annotation={current}
            onChange={onChange}
            columns={columns}
            queryEditor={<div data-test-subj="esql-query-editor" />}
          />
        ),
      }}
    />,
    { wrapper: EuiThemeProvider }
  );
  return onAnnotationChange;
};

describe('ES|QL annotation editor', () => {
  it('offers ES|QL placement without data-view-dependent controls', () => {
    renderEditor();

    expect(screen.getByTestId('lnsXY_annotation_esql')).toBeInTheDocument();
    expect(screen.queryByTestId('lnsXY_annotation_query')).not.toBeInTheDocument();
    expect(screen.getByTestId('esql-query-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('lns-xyAnnotation-time')).not.toBeInTheDocument();
  });

  it('switches manual placement to ES|QL while keeping point appearance', () => {
    const onChange = renderEditor({
      id: annotation.id,
      type: 'manual',
      key: { type: 'point_in_time', timestamp: '2026-01-01T00:00:00Z' },
      label: annotation.label,
      color: annotation.color,
      icon: 'triangle',
      lineStyle: 'dashed',
      lineWidth: 3,
    });

    fireEvent.click(screen.getByTestId('lnsXY_annotation_esql'));

    expect(onChange).toHaveBeenCalledWith({
      ...annotation,
      query: { esql: '' },
      timeColumn: '',
      textColumn: undefined,
      extraColumns: undefined,
    });
  });

  it('removes ES|QL-specific properties when switching back to manual', () => {
    const onChange = renderEditor();

    fireEvent.click(screen.getByTestId('lnsXY_annotation_manual'));

    expect(onChange).toHaveBeenCalledWith({
      id: annotation.id,
      type: 'manual',
      key: { type: 'point_in_time', timestamp: expect.any(String) },
      label: annotation.label,
      color: annotation.color,
      icon: 'triangle',
      lineStyle: 'dashed',
      lineWidth: 3,
    });
  });

  it('reflects the text column in text decoration and clears it when switching to name', () => {
    const onChange = renderEditor({ ...annotation, textVisibility: true });

    expect(screen.getByTestId('lnsXY_textVisibility_field')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByTestId('lnsXY_textVisibility_name'));

    expect(onChange).toHaveBeenCalledWith({
      ...annotation,
      textVisibility: true,
      textColumn: undefined,
    });
  });

  it('keeps the bound column when Field is selected again', () => {
    const onChange = renderEditor({ ...annotation, textVisibility: false });

    fireEvent.click(screen.getByTestId('lnsXY_textVisibility_name'));
    onChange.mockClear();
    fireEvent.click(screen.getByTestId('lnsXY_textVisibility_field'));

    const [[updated]] = onChange.mock.calls;
    expect(updated).toEqual(
      expect.objectContaining({ textColumn: 'version', textVisibility: true })
    );
  });

  it('picks the text column under Text decoration instead of a separate top picker', async () => {
    const onChange = renderEditor({ ...annotation, textColumn: undefined, textVisibility: false });

    expect(screen.queryByTestId('lnsXY-annotation-esql-textColumn')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('lnsXY-annotation-esql-text-decoration-field-picker')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lnsXY_textVisibility_field'));
    const picker = await screen.findByTestId('lnsXY-annotation-esql-text-decoration-field-picker');
    fireEvent.click(within(picker).getByRole('combobox'));
    fireEvent.click(await screen.findByTestId('lnsXY-annotation-fieldOption-version'));

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ textColumn: 'version', textVisibility: true })
      )
    );
  });

  it('keeps the text field picker for ranges, which have no text decoration', () => {
    renderEditor({
      ...annotation,
      key: { type: 'range' },
      endTimeColumn: 'end',
    } as EsqlEventAnnotationConfig);

    expect(screen.getByTestId('lnsXY-annotation-esql-textColumn')).toBeInTheDocument();
    expect(screen.queryByTestId('lns-lineMarker-text-visibility')).not.toBeInTheDocument();
  });

  it('keeps query and column bindings when editing appearance', async () => {
    const onChange = renderEditor();

    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'New label' } });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ ...annotation, label: 'New label' })
    );
  });

  it('switches to a range without retaining point-only appearance', () => {
    const onChange = renderEditor();

    fireEvent.click(screen.getByRole('switch', { name: 'Time range' }));

    expect(onChange).toHaveBeenCalledWith({
      id: annotation.id,
      type: 'esql',
      key: { type: 'range' },
      query: annotation.query,
      timeColumn: 'start',
      endTimeColumn: '',
      textColumn: 'version',
      extraColumns: ['version'],
      label: 'Deployments',
      color: '#FF00001A',
    });
  });

  it('switches a range back to a point without retaining range-only properties', () => {
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
    const onChange = renderEditor(range);

    fireEvent.click(screen.getByRole('switch', { name: 'Time range' }));

    expect(onChange).toHaveBeenCalledWith({
      id: range.id,
      type: 'esql',
      query: range.query,
      key: { type: 'point_in_time' },
      timeColumn: 'start',
      label: 'Maintenance',
      color: '#FF0000',
    });
  });
});
