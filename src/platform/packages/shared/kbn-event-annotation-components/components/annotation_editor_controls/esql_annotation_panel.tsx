/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useId } from 'react';
import type { ReactNode } from 'react';
import { EuiComboBox, EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import {
  defaultAnnotationLabel,
  defaultRangeAnnotationLabel,
  toLineAnnotationColor,
  toRangeAnnotationColor,
} from './helpers';

interface Props {
  annotation: EsqlEventAnnotationConfig;
  columns: DatatableColumn[];
  onChange: (annotation: EsqlEventAnnotationConfig) => void;
  queryEditor: ReactNode;
}

export const ConfigPanelEsqlAnnotation = ({
  annotation,
  columns,
  onChange,
  queryEditor,
}: Props) => {
  const tooltipColumnsId = useId();
  const rangeSwitchId = useId();
  const dateColumns = columns.filter(({ meta }) => meta.type === 'date');
  const extraColumns = annotation.extraColumns ?? [];
  const missingExtraColumns = extraColumns.filter(
    (name) => !columns.some(({ name: columnName }) => columnName === name)
  );

  return (
    <>
      {queryEditor}
      <EuiFormRow display="rowCompressed" fullWidth>
        <EuiSwitch
          id={rangeSwitchId}
          labelProps={{ id: `${rangeSwitchId}-label` }}
          data-test-subj="lnsXY-annotation-esql-timeRange"
          compressed
          label={i18n.translate('eventAnnotationComponents.esqlAnnotation.timeRangeToggleSwitch', {
            defaultMessage: 'Time range',
          })}
          checked={'endTimeColumn' in annotation}
          onChange={() => {
            if ('endTimeColumn' in annotation) {
              const { endTimeColumn, outside, ...point } = annotation;
              onChange({
                ...point,
                key: { type: 'point_in_time' },
                color: toLineAnnotationColor(annotation.color),
                label:
                  annotation.label === defaultRangeAnnotationLabel
                    ? defaultAnnotationLabel
                    : annotation.label,
              });
              return;
            }
            onChange({
              ...annotation,
              key: { type: 'range' },
              endTimeColumn: '',
              color: toRangeAnnotationColor(annotation.color),
              label:
                annotation.label === defaultAnnotationLabel
                  ? defaultRangeAnnotationLabel
                  : annotation.label,
            });
          }}
        />
      </EuiFormRow>
      <ColumnPicker
        label={i18n.translate('eventAnnotationComponents.esqlAnnotation.timeColumnLabel', {
          defaultMessage: 'Time column',
        })}
        columns={dateColumns}
        value={annotation.timeColumn}
        onChange={(timeColumn) => onChange({ ...annotation, timeColumn })}
        data-test-subj="lnsXY-annotation-esql-timeColumn"
        required
      />
      {'endTimeColumn' in annotation && (
        <ColumnPicker
          label={i18n.translate('eventAnnotationComponents.esqlAnnotation.endTimeColumnLabel', {
            defaultMessage: 'End time column',
          })}
          columns={dateColumns}
          value={annotation.endTimeColumn}
          onChange={(endTimeColumn) => onChange({ ...annotation, endTimeColumn })}
          data-test-subj="lnsXY-annotation-esql-endTimeColumn"
          required
        />
      )}
      <ColumnPicker
        label={i18n.translate('eventAnnotationComponents.esqlAnnotation.textColumnLabel', {
          defaultMessage: 'Text column',
        })}
        columns={columns}
        value={annotation.textColumn ?? ''}
        data-test-subj="lnsXY-annotation-esql-textColumn"
        onChange={(textColumn) =>
          onChange({
            ...annotation,
            textColumn: textColumn || undefined,
            ...(!('endTimeColumn' in annotation) && textColumn ? { textVisibility: true } : {}),
          })
        }
      />
      <EuiFormRow
        id={tooltipColumnsId}
        label={i18n.translate('eventAnnotationComponents.esqlAnnotation.extraColumnsLabel', {
          defaultMessage: 'Tooltip columns',
        })}
        display="rowCompressed"
        fullWidth
        isInvalid={missingExtraColumns.length > 0}
        error={missingExtraColumns.map((column) => getMissingColumnError(column))}
      >
        <EuiComboBox
          compressed
          fullWidth
          options={columns.map(({ name }) => ({ label: name }))}
          selectedOptions={extraColumns.map((name) => ({ label: name }))}
          onChange={(selected) =>
            onChange({ ...annotation, extraColumns: selected.map(({ label }) => label) })
          }
          isInvalid={missingExtraColumns.length > 0}
          data-test-subj="lnsXY-annotation-esql-tooltip-columns"
        />
      </EuiFormRow>
    </>
  );
};

const getMissingColumnError = (column: string): string =>
  i18n.translate('eventAnnotationComponents.esqlAnnotation.missingColumnErrorMessage', {
    defaultMessage: 'Column {column} is missing or has an incompatible type. Update the selection.',
    values: { column },
  });

const ColumnPicker = ({
  label,
  columns,
  value,
  onChange,
  required = false,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  columns: DatatableColumn[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  'data-test-subj': string;
}) => {
  const id = useId();
  const missingColumn = Boolean(value && !columns.some(({ name }) => name === value));
  const isInvalid = missingColumn || (required && !value);

  return (
    <EuiFormRow
      id={id}
      label={label}
      display="rowCompressed"
      fullWidth
      isInvalid={isInvalid}
      error={
        missingColumn
          ? getMissingColumnError(value)
          : i18n.translate('eventAnnotationComponents.esqlAnnotation.requiredColumnErrorMessage', {
              defaultMessage: 'Select a column.',
            })
      }
    >
      <EuiSelect
        compressed
        fullWidth
        value={value}
        options={[
          {
            value: '',
            text: required
              ? i18n.translate('eventAnnotationComponents.esqlAnnotation.columnPlaceholder', {
                  defaultMessage: 'Select a column',
                })
              : i18n.translate(
                  'eventAnnotationComponents.esqlAnnotation.noColumnDropDownOptionLabel',
                  {
                    defaultMessage: 'None',
                  }
                ),
          },
          ...(missingColumn ? [{ value, text: value }] : []),
          ...columns.map(({ name }) => ({ value: name, text: name })),
        ]}
        isInvalid={isInvalid}
        onChange={(event) => onChange(event.target.value)}
        data-test-subj={dataTestSubj}
      />
    </EuiFormRow>
  );
};
