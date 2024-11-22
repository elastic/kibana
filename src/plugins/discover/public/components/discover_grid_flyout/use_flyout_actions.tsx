/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FlyoutActionItem, FlyoutCustomization } from '../../customizations';
import { UseNavigationProps, useNavigationProps } from '../../hooks/use_navigation_props';

interface UseFlyoutActionsParams extends UseNavigationProps {
  actions?: FlyoutCustomization['actions'];
}

export const useFlyoutActions = ({
  actions,
  ...props
}: UseFlyoutActionsParams): { flyoutActions: FlyoutActionItem[] } => {
  const { dataView } = props;
  const { singleDocHref, contextViewHref, onOpenSingleDoc, onOpenContextView } =
    useNavigationProps(props);

  const {
    viewSingleDocument = { disabled: false },
    viewSurroundingDocument = { disabled: false },
  } = actions?.defaultActions ?? {};
  const customActions = [...(actions?.getActionItems?.() ?? [])];

  const flyoutActions: FlyoutActionItem[] = [
    {
      id: 'singleDocument',
      enabled: !viewSingleDocument.disabled,
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
      enabled: Boolean(!viewSurroundingDocument.disabled && dataView.isTimeBased() && dataView.id),
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
    ...customActions,
  ];

  return { flyoutActions: flyoutActions.filter((action) => action.enabled) };
};
