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
import type { EuiFlyoutMenuCustomAction } from '@elastic/eui';
import type { UseNavigationProps } from '../../hooks/use_navigation_props';
import { useNavigationProps } from '../../hooks/use_navigation_props';

const asUnhandledClick = (handler: (event: MouseEvent) => void): (() => void) => {
  return () => {
    handler({ preventDefault() {} } as MouseEvent);
  };
};

export const useFlyoutActions = (
  props: UseNavigationProps
): { flyoutMenuCustomActions: EuiFlyoutMenuCustomAction[] } => {
  const { dataView } = props;
  const { onOpenSingleDoc, onOpenContextView } = useNavigationProps(props);

  const flyoutMenuCustomActions = useMemo(() => {
    const actions: Array<EuiFlyoutMenuCustomAction & { enabled: boolean }> = [
      {
        enabled: true,
        iconType: 'document',
        'aria-label': i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkLabel', {
          defaultMessage: 'View single document',
        }),
        onClick: asUnhandledClick(onOpenSingleDoc),
      },
      {
        enabled: Boolean(dataView.isTimeBased() && dataView.id),
        iconType: 'documents',
        'aria-label': i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkLabel', {
          defaultMessage: 'View surrounding documents',
        }),
        onClick: asUnhandledClick(onOpenContextView),
      },
    ];

    return actions
      .filter((action) => action.enabled)
      .map(({ enabled: _enabled, ...action }) => action);
  }, [dataView, onOpenContextView, onOpenSingleDoc]);

  return { flyoutMenuCustomActions };
};
