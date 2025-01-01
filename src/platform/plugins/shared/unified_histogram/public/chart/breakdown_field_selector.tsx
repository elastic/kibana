/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSelectableOption } from '@elastic/eui';
import {
  FieldIcon,
  getFieldIconProps,
  comboBoxFieldOptionMatcher,
  fieldSupportsBreakdown,
} from '@kbn/field-utils';
import { css } from '@emotion/react';
import { isESQLColumnGroupable } from '@kbn/esql-utils';
import { type DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { i18n } from '@kbn/i18n';
import { UnifiedHistogramBreakdownContext } from '../types';
import {
  ToolbarSelector,
  ToolbarSelectorProps,
  EMPTY_OPTION,
  SelectableEntry,
} from './toolbar_selector';

export interface BreakdownFieldSelectorProps {
  dataView: DataView;
  breakdown: UnifiedHistogramBreakdownContext;
  esqlColumns?: DatatableColumn[];
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
}

const mapToDropdownFields = (dataView: DataView, esqlColumns?: DatatableColumn[]) => {
  if (esqlColumns) {
    return (
      // filter out unsupported field types and counter time series metrics
      esqlColumns
        .filter(isESQLColumnGroupable)
        .map((column) => new DataViewField(convertDatatableColumnToDataViewFieldSpec(column)))
    );
  }

  return dataView.fields.filter(fieldSupportsBreakdown);
};

export const BreakdownFieldSelector = ({
  dataView,
  breakdown,
  esqlColumns,
  onBreakdownFieldChange,
}: BreakdownFieldSelectorProps) => {
  const fields = useMemo(() => mapToDropdownFields(dataView, esqlColumns), [dataView, esqlColumns]);
  const fieldOptions: SelectableEntry[] = useMemo(() => {
    const options: SelectableEntry[] = fields
      .map((field) => ({
        key: field.name,
        name: field.name,
        label: field.displayName,
        value: field.name,
        checked:
          breakdown?.field?.name === field.name
            ? ('on' as EuiSelectableOption['checked'])
            : undefined,
        prepend: (
          <span
            css={css`
              .euiToken {
                vertical-align: middle;
              }
            `}
          >
            <FieldIcon {...getFieldIconProps(field)} />
          </span>
        ),
      }))
      .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

    options.unshift({
      key: EMPTY_OPTION,
      value: EMPTY_OPTION,
      label: i18n.translate('unifiedHistogram.breakdownFieldSelector.noBreakdownButtonLabel', {
        defaultMessage: 'No breakdown',
      }),
      checked: !breakdown?.field ? ('on' as EuiSelectableOption['checked']) : undefined,
    });

    return options;
  }, [fields, breakdown?.field]);

  const onChange = useCallback<NonNullable<ToolbarSelectorProps['onChange']>>(
    (chosenOption) => {
      const breakdownField = chosenOption?.value
        ? fields.find((currentField) => currentField.name === chosenOption.value)
        : undefined;
      onBreakdownFieldChange?.(breakdownField);
    },
    [fields, onBreakdownFieldChange]
  );

  return (
    <ToolbarSelector
      data-test-subj="unifiedHistogramBreakdownSelector"
      data-selected-value={breakdown?.field?.name}
      searchable
      buttonLabel={
        breakdown?.field?.displayName
          ? i18n.translate('unifiedHistogram.breakdownFieldSelector.breakdownByButtonLabel', {
              defaultMessage: 'Breakdown by {fieldName}',
              values: {
                fieldName: breakdown?.field?.displayName,
              },
            })
          : i18n.translate('unifiedHistogram.breakdownFieldSelector.noBreakdownButtonLabel', {
              defaultMessage: 'No breakdown',
            })
      }
      popoverTitle={i18n.translate(
        'unifiedHistogram.breakdownFieldSelector.breakdownFieldPopoverTitle',
        {
          defaultMessage: 'Select breakdown field',
        }
      )}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={fieldOptions}
      onChange={onChange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default BreakdownFieldSelector;
