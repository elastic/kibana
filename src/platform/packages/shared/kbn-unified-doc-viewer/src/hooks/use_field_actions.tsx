/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import createContainer from 'constate';
import type { IconType } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '../types';
import {
  getFindSimilarValuesValue,
  shouldShowFieldFindSimilarValuesAction,
} from '../../utils/should_show_field_find_similar_values_action';
import type { FieldMapping } from '../services/types';

interface WithFieldParam {
  field: string;
  mapping?: FieldMapping;
}

interface WithValueParam {
  value: unknown;
}

interface FieldActionParams extends WithFieldParam, WithValueParam {
  formattedValue?: string;
}

export interface TFieldAction {
  id: string;
  iconType: IconType;
  label: string;
  onClick: () => void;
}

export type UseFieldActionsDeps = Pick<
  DocViewRenderProps,
  'columns' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'dataView' | 'onFindSimilarValues'
>;

const useFieldActions = ({
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
  dataView,
  onFindSimilarValues,
}: UseFieldActionsDeps) => {
  return useMemo(
    () => ({
      addColumn: onAddColumn,
      addFilterExist: ({ field }: WithFieldParam) => filter && filter('_exists_', field, '+'),
      addFilterIn: ({ field, value, mapping }: FieldActionParams) =>
        filter && filter(mapping ?? field, value, '+'),
      addFilterOut: ({ field, value, mapping }: FieldActionParams) =>
        filter && filter(mapping ?? field, value, '-'),
      copyToClipboard,
      removeColumn: onRemoveColumn,
      isColumnAdded: ({ field }: WithFieldParam) => columns?.includes(field) ?? false,
      toggleFieldColumn: ({ field }: WithFieldParam) => {
        if (!columns) return;
        const isFieldInTable = columns.includes(field);
        if (isFieldInTable && onRemoveColumn) {
          onRemoveColumn(field);
        } else if (!isFieldInTable && onAddColumn) {
          onAddColumn(field);
        }
      },
      canFindSimilarValues: ({ field }: WithFieldParam) =>
        shouldShowFieldFindSimilarValuesAction({
          dataView,
          dataViewField: dataView?.fields.getByName(field),
          onFindSimilarValues,
        }),
      findSimilarValues: ({ field, value }: WithFieldParam & WithValueParam) => {
        const fieldValue = getFindSimilarValuesValue(value);
        if (fieldValue !== undefined) {
          onFindSimilarValues?.(field, fieldValue);
        }
      },
    }),
    [columns, filter, onAddColumn, onRemoveColumn, dataView, onFindSimilarValues]
  );
};

export const [FieldActionsProvider, useFieldActionsContext] = createContainer(useFieldActions);

export const useUIFieldActions = ({
  field,
  value,
  mapping,
  formattedValue,
}: FieldActionParams): TFieldAction[] => {
  const actions = useFieldActionsContext();

  return useMemo(
    () => [
      {
        id: 'addFilterInAction',
        iconType: 'plusCircle',
        label: filterForValueLabel,
        onClick: () => actions.addFilterIn({ field, value, mapping }),
      },
      {
        id: 'addFilterOutremoveFromFilterAction',
        iconType: 'minusCircle',
        label: filterOutValueLabel,
        onClick: () => actions.addFilterOut({ field, value, mapping }),
      },
      {
        id: 'addFilterExistAction',
        iconType: 'filter',
        label: filterForFieldPresentLabel,
        onClick: () => actions.addFilterExist({ field }),
      },
      {
        id: 'toggleFieldColumnAction',
        iconType: actions.isColumnAdded({ field }) ? 'cross' : 'plusCircle',
        label: toggleColumnLabel,
        onClick: () => actions.toggleFieldColumn({ field }),
      },
      ...(actions.canFindSimilarValues({ field }) && getFindSimilarValuesValue(value) !== undefined
        ? [
            {
              id: 'findSimilarValuesAction',
              iconType: 'search',
              label: findSimilarValuesLabel,
              onClick: () => actions.findSimilarValues({ field, value }),
            },
          ]
        : []),
      {
        id: 'copyToClipboardAction',
        iconType: 'copy',
        label: copyToClipboardLabel,
        onClick: () => actions.copyToClipboard(formattedValue ?? (value as string)),
      },
    ],
    [actions, field, mapping, formattedValue, value]
  );
};

const filterForValueLabel = i18n.translate('unifiedDocViewer.fieldActions.filterForValue', {
  defaultMessage: 'Filter for value',
});

const filterOutValueLabel = i18n.translate('unifiedDocViewer.fieldActions.filterOutValue', {
  defaultMessage: 'Filter out value',
});

const filterForFieldPresentLabel = i18n.translate(
  'unifiedDocViewer.fieldActions.filterForFieldPresent',
  { defaultMessage: 'Filter for field present' }
);

const toggleColumnLabel = i18n.translate('unifiedDocViewer.fieldActions.toggleColumn', {
  defaultMessage: 'Toggle column in table',
});

const findSimilarValuesLabel = i18n.translate('unifiedDocViewer.fieldActions.findSimilarValues', {
  defaultMessage: 'Find similar values',
});

const copyToClipboardLabel = i18n.translate('unifiedDocViewer.fieldActions.copyToClipboard', {
  defaultMessage: 'Copy to clipboard',
});
