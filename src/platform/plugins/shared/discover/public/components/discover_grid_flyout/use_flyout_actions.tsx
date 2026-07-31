/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { EuiFlyoutMenuAction } from '@elastic/eui';
import type { UseNavigationProps } from '../../hooks/use_navigation_props';
import { useNavigationProps } from '../../hooks/use_navigation_props';

const asUnhandledClick = (handler: (event: MouseEvent) => void): (() => void) => {
  return () => {
    handler({ preventDefault() {} } as MouseEvent);
  };
};

export interface FlyoutMenuActions {
  leadingActions: EuiFlyoutMenuAction[];
  trailingActions: EuiFlyoutMenuAction[];
}

export const useFlyoutActions = (props: UseNavigationProps): FlyoutMenuActions => {
  const { dataView } = props;
  const { onOpenSingleDoc, onOpenContextView } = useNavigationProps(props);

  return useMemo(() => {
    // The menu buttons are icon-only, so every action carries a tooltip. Where
    // there is nothing to add beyond the name, the tooltip repeats the label.
    const singleDocumentLabel = i18n.translate(
      'discover.grid.tableRow.viewSingleDocumentLinkLabel',
      { defaultMessage: 'View single document' }
    );

    const leadingActions: EuiFlyoutMenuAction[] = [];

    if (dataView.isTimeBased() && dataView.id) {
      leadingActions.push({
        iconType: 'documents',
        'aria-label': i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkLabel', {
          defaultMessage: 'View surrounding documents',
        }),
        toolTipContent: i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsHover', {
          defaultMessage:
            'Inspect documents that occurred before and after this document. Only pinned filters remain active in the Surrounding documents view.',
        }),
        onClick: asUnhandledClick(onOpenContextView),
      });
    }

    return {
      leadingActions,
      trailingActions: [
        {
          iconType: 'maximize',
          'aria-label': singleDocumentLabel,
          toolTipContent: singleDocumentLabel,
          onClick: asUnhandledClick(onOpenSingleDoc),
        },
      ],
    };
  }, [dataView, onOpenContextView, onOpenSingleDoc]);
};
