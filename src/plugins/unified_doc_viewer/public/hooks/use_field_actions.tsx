/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import createContainer from 'constate';
import { copyToClipboard, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';

interface WithFieldParam {
  field: string;
}

interface WithValueParam {
  value: string;
}

interface TFieldActionParams extends WithFieldParam, WithValueParam {}

export interface TFieldAction {
  id: string;
  iconType: IconType;
  label: string;
  onClick: () => void;
}

type UseFieldActionsDeps = Pick<
  DocViewRenderProps,
  'columns' | 'filter' | 'onAddColumn' | 'onRemoveColumn'
>;

const useFieldActions = ({ columns, filter, onAddColumn, onRemoveColumn }: UseFieldActionsDeps) => {
  return useMemo(
    () => ({
      addColumn: onAddColumn,
      addFilterExist: ({ field }: WithFieldParam) => filter && filter('_exists_', field, '+'),
      addFilterIn: ({ field, value }: TFieldActionParams) => filter && filter(field, value, '+'),
      addFilterOut: ({ field, value }: TFieldActionParams) => filter && filter(field, value, '-'),
      copyToClipboard,
      removeColumn: onRemoveColumn,
      toggleFieldColumn: ({ field }: WithFieldParam) => {
        if (!columns) return;
        const isFieldInTable = columns.includes(field);
        if (isFieldInTable && onRemoveColumn) {
          onRemoveColumn(field);
        } else if (!isFieldInTable && onAddColumn) {
          onAddColumn(field);
        }
      },
    }),
    [columns, filter, onAddColumn, onRemoveColumn]
  );
};

export const [FieldActionsProvider, useFieldActionsContext] = createContainer(useFieldActions);

export const useUIFieldActions = ({ field, value }: TFieldActionParams): TFieldAction[] => {
  const actions = useFieldActionsContext();

  return useMemo(
    () => [
      {
        id: 'addFilterInAction',
        iconType: 'plusInCircle',
        label: actionFilterForText(value),
        onClick: () => actions.addFilterIn({ field, value }),
      },
      {
        id: 'addFilterOutremoveFromFilterAction',
        iconType: 'minusInCircle',
        label: actionFilterOutText(value),
        onClick: () => actions.addFilterOut({ field, value }),
      },
      {
        id: 'addFilterExistAction',
        iconType: 'filter',
        label: filterForFieldPresentLabel,
        onClick: () => actions.addFilterExist({ field }),
      },
      {
        id: 'toggleFieldColumnAction',
        iconType: 'listAdd',
        label: toggleColumnLabel,
        onClick: () => actions.toggleFieldColumn({ field }),
      },
      {
        id: 'copyToClipboardAction',
        iconType: 'copyClipboard',
        label: copyToClipboardLabel,
        onClick: () => actions.copyToClipboard(value),
      },
    ],
    [actions, field, value]
  );
};

const actionFilterForText = (value: string) =>
  i18n.translate('unifiedDocViewer.fieldActions.filterIn', {
    defaultMessage: 'Filter for this {value}',
    values: { value },
  });

const actionFilterOutText = (value: string) =>
  i18n.translate('unifiedDocViewer.fieldActions.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: { value },
  });

const filterForFieldPresentLabel = i18n.translate(
  'unifiedDocViewer.fieldActions.filterForFieldPresent',
  { defaultMessage: 'Filter for field present' }
);

const toggleColumnLabel = i18n.translate('unifiedDocViewer.fieldActions.toggleColumn', {
  defaultMessage: 'Toggle column in table',
});

const copyToClipboardLabel = i18n.translate('unifiedDocViewer.fieldActions.copyToClipboard', {
  defaultMessage: 'Copy to clipboard',
});
