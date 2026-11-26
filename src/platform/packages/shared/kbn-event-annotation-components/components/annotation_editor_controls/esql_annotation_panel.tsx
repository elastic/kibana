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
import { EuiFormRow, EuiSelect, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import { getPointToRangeOverrides, getRangeToPointOverrides } from './helpers';

interface Props {
  annotation: EsqlEventAnnotationConfig;
  columns: DatatableColumn[];
  onChange: (annotation: EsqlEventAnnotationConfig) => void;
  queryEditor: ReactNode;
  /** Rendered right below the query editor, e.g. the accordion with the query results. */
  queryResults?: ReactNode;
}

export const ConfigPanelEsqlAnnotation = ({
  annotation,
  columns,
  onChange,
  queryEditor,
  queryResults,
}: Props) => {
  const rangeSwitchId = useId();
  const isRange = 'endTimeColumn' in annotation;
  const dateColumns = columns.filter(({ meta }) => meta.type === 'date');

  return (
    <>
      {queryEditor}
      {queryResults}
      <EuiSpacer size="m" />
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        helpText={
          isRange
            ? i18n.translate('eventAnnotationComponents.esqlAnnotation.timeRangeHelpText', {
                defaultMessage:
                  'The chart time range is applied to the time field of the query source. Ranges that started before the chart time range are not shown.',
              })
            : undefined
        }
      >
        <EuiSwitch
          id={rangeSwitchId}
          labelProps={{ id: `${rangeSwitchId}-label` }}
          data-test-subj="lnsXY-annotation-esql-timeRange"
          compressed
          label={i18n.translate('eventAnnotationComponents.esqlAnnotation.timeRangeToggleSwitch', {
            defaultMessage: 'Time range',
          })}
          checked={isRange}
          onChange={() => {
            if ('endTimeColumn' in annotation) {
              const { endTimeColumn, outside, ...point } = annotation;
              onChange({
                ...point,
                key: { type: 'point_in_time' },
                ...getRangeToPointOverrides(annotation),
              });
              return;
            }
            onChange({
              ...annotation,
              key: { type: 'range' },
              endTimeColumn: '',
              ...getPointToRangeOverrides(annotation),
            });
          }}
        />
      </EuiFormRow>
      <ColumnPicker
        label={i18n.translate('eventAnnotationComponents.esqlAnnotation.timeColumnLabel', {
          defaultMessage: 'Target date field',
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
            defaultMessage: 'End date field',
          })}
          columns={dateColumns}
          value={annotation.endTimeColumn}
          onChange={(endTimeColumn) => onChange({ ...annotation, endTimeColumn })}
          data-test-subj="lnsXY-annotation-esql-endTimeColumn"
          required
        />
      )}
      {isRange && (
        // Points choose their text under Text decoration; ranges have no text decoration
        <ColumnPicker
          label={i18n.translate('eventAnnotationComponents.esqlAnnotation.textColumnLabel', {
            defaultMessage: 'Text field',
          })}
          columns={columns}
          value={annotation.textColumn ?? ''}
          data-test-subj="lnsXY-annotation-esql-textColumn"
          onChange={(textColumn) =>
            onChange({ ...annotation, textColumn: textColumn || undefined })
          }
        />
      )}
    </>
  );
};

const getMissingColumnError = (column: string): string =>
  i18n.translate('eventAnnotationComponents.esqlAnnotation.missingColumnErrorMessage', {
    defaultMessage: 'Field {column} is missing or has an incompatible type. Update the selection.',
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
              defaultMessage: 'Select a field.',
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
                  defaultMessage: 'Select a field',
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
