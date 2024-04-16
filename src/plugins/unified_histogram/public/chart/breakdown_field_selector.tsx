/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSelectableOption } from '@elastic/eui';
import { FieldIcon, getFieldIconProps } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { UnifiedHistogramBreakdownContext } from '../types';
import { fieldSupportsBreakdown } from '../utils/field_supports_breakdown';
import {
  ToolbarSelector,
  ToolbarSelectorProps,
  EMPTY_OPTION,
  SelectableEntry,
} from './toolbar_selector';

export interface BreakdownFieldSelectorProps {
  dataView: DataView;
  breakdown: UnifiedHistogramBreakdownContext;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
}

export const BreakdownFieldSelector = ({
  dataView,
  breakdown,
  onBreakdownFieldChange,
}: BreakdownFieldSelectorProps) => {
  const fieldOptions: SelectableEntry[] = useMemo(() => {
    const options: SelectableEntry[] = dataView.fields
      .filter(fieldSupportsBreakdown)
      .map((field) => ({
        key: field.name,
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
  }, [dataView, breakdown.field]);

  const onChange: ToolbarSelectorProps['onChange'] = useCallback(
    (chosenOption) => {
      const field = chosenOption?.value
        ? dataView.fields.find((currentField) => currentField.name === chosenOption.value)
        : undefined;
      onBreakdownFieldChange?.(field);
    },
    [dataView.fields, onBreakdownFieldChange]
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
      options={fieldOptions}
      onChange={onChange}
    />
  );
};
