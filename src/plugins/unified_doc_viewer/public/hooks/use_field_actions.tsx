/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState } from 'react';
import { copyToClipboard, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscoverActionsContext } from './use_discover_action';

interface HoverActionProps {
  field: string;
  value: string;
}

export interface HoverActionType {
  id: string;
  tooltipContent: string;
  iconType: IconType;
  onClick: () => void;
  display: boolean;
}

export const useFieldActions = ({ field, value }: HoverActionProps): HoverActionType[] => {
  const filterForText = actionFilterForText(value);
  const filterOutText = actionFilterOutText(value);
  const actions = useDiscoverActionsContext();
  const [columnAdded, setColumnAdded] = useState<boolean>(false);

  return useMemo(
    () => [
      {
        id: 'addToFilterAction',
        tooltipContent: filterForText,
        iconType: 'plusInCircle',
        onClick: () => actions?.addFilter && actions.addFilter(field, value, '+'),
        display: true,
      },
      {
        id: 'removeFromFilterAction',
        tooltipContent: filterOutText,
        iconType: 'minusInCircle',
        onClick: () => actions?.addFilter && actions.addFilter(field, value, '-'),
        display: true,
      },
      {
        id: 'filterForFieldPresentAction',
        tooltipContent: filterForFieldPresentLabel,
        iconType: 'filter',
        onClick: () => actions?.addFilter && actions.addFilter('_exists_', field, '+'),
        display: true,
      },
      {
        id: 'toggleColumnAction',
        tooltipContent: toggleColumnLabel,
        iconType: 'listAdd',
        onClick: () => {
          if (actions) {
            if (columnAdded) {
              actions?.removeColumn?.(field);
            } else {
              actions?.addColumn?.(field);
            }
            setColumnAdded(!columnAdded);
          }
        },
        display: true,
      },
      {
        id: 'copyToClipboardAction',
        tooltipContent: copyToClipboardLabel,
        iconType: 'copyClipboard',
        onClick: () => copyToClipboard(value as string),
        display: true,
      },
    ],
    [filterForText, filterOutText, actions, field, value, columnAdded]
  );
};

const actionFilterForText = (text: string) =>
  i18n.translate('unifiedDocViewer.fieldActions.filterFor', {
    defaultMessage: 'Filter for this {value}',
    values: {
      value: text,
    },
  });

const actionFilterOutText = (text: string) =>
  i18n.translate('unifiedDocViewer.fieldActions.filterOut', {
    defaultMessage: 'Filter out this {value}',
    values: {
      value: text,
    },
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
