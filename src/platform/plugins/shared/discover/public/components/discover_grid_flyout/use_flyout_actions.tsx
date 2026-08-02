/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { UseNavigationProps } from '../../hooks/use_navigation_props';
import { useNavigationProps } from '../../hooks/use_navigation_props';
import type { FlyoutActionItem } from './types';

export const useFlyoutActions = (
  props: UseNavigationProps & { onCopyLink?: () => void }
): { flyoutActions: FlyoutActionItem[] } => {
  const { dataView, onCopyLink } = props;
  const { singleDocHref, contextViewHref, onOpenSingleDoc, onOpenContextView } =
    useNavigationProps(props);

  const flyoutActions = useMemo(() => {
    const actions: FlyoutActionItem[] = [
      {
        id: 'singleDocument',
        enabled: true,
        dataTestSubj: 'docTableRowAction',
        iconType: 'document',
        href: singleDocHref,
        onClick: onOpenSingleDoc,
        label: i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkLabel', {
          defaultMessage: 'View single document',
        }),
      },
      {
        id: 'surroundingDocument',
        enabled: Boolean(dataView.isTimeBased() && dataView.id),
        dataTestSubj: 'docTableRowAction',
        iconType: 'documents',
        href: contextViewHref,
        onClick: onOpenContextView,
        label: i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkLabel', {
          defaultMessage: 'View surrounding documents',
        }),
        helpText: i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsHover', {
          defaultMessage:
            'Inspect documents that occurred before and after this document. Only pinned filters remain active in the Surrounding documents view.',
        }),
      },
      {
        id: 'copyLink',
        enabled: Boolean(onCopyLink),
        dataTestSubj: 'docTableCopyLink',
        iconType: 'link',
        onClick: () => onCopyLink?.(),
        label: i18n.translate('discover.grid.tableRow.copyLinkLabel', {
          defaultMessage: 'Copy link',
        }),
        helpText: i18n.translate('discover.grid.tableRow.copyLinkHover', {
          defaultMessage:
            'Copy a link that reopens this document. The time range is captured as absolute values, so others see the same results.',
        }),
      },
    ];

    return actions.filter((action) => action.enabled);
  }, [contextViewHref, dataView, onCopyLink, onOpenContextView, onOpenSingleDoc, singleDocHref]);

  return { flyoutActions };
};
