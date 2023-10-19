/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscoverCustomization } from '../../customizations';
import { UseNavigationProps, useNavigationProps } from '../../hooks/use_navigation_props';

interface FlyoutActionProps {
  onClick: React.MouseEventHandler<Element>;
  href: string;
}

const staticViewDocumentItem = {
  id: 'viewDocument',
  enabled: true,
  Content: () => <ViewDocument />,
};

export const useFlyoutActions = (navigationProps: UseNavigationProps) => {
  const { dataView } = navigationProps;
  const { singleDocHref, contextViewHref, onOpenSingleDoc, onOpenContextView } =
    useNavigationProps(navigationProps);

  const flyoutCustomization = useDiscoverCustomization('flyout');

  const {
    viewSingleDocument = { disabled: false },
    viewSurroundingDocument = { disabled: false },
  } = flyoutCustomization?.actions?.defaultActions ?? {};
  const customActions = [...(flyoutCustomization?.actions?.getActionItems?.() ?? [])];

  const flyoutActions = [
    {
      id: 'singleDocument',
      enabled: !viewSingleDocument.disabled,
      Content: () => <SingleDocument href={singleDocHref} onClick={onOpenSingleDoc} />,
    },
    {
      id: 'surroundingDocument',
      enabled: Boolean(!viewSurroundingDocument.disabled && dataView.isTimeBased() && dataView.id),
      Content: () => <SurroundingDocuments onClick={onOpenContextView} href={contextViewHref} />,
    },
    ...customActions,
  ];

  const hasEnabledActions = flyoutActions.some((action) => action.enabled);

  if (hasEnabledActions) {
    flyoutActions.unshift(staticViewDocumentItem);
  }

  return { flyoutActions, hasEnabledActions };
};

const ViewDocument = () => {
  return (
    <EuiHideFor sizes={['xs', 's', 'm']}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>
            {i18n.translate('discover.grid.tableRow.viewText', {
              defaultMessage: 'View:',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
    </EuiHideFor>
  );
};

const SingleDocument = (props: FlyoutActionProps) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        size="s"
        iconSize="s"
        iconType="document"
        flush="left"
        data-test-subj="docTableRowAction"
        {...props}
      >
        {i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkTextSimple', {
          defaultMessage: 'Single document',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};

const SurroundingDocuments = (props: FlyoutActionProps) => {
  return (
    <EuiFlexGroup alignItems="center" responsive={false} gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconSize="s"
          iconType="documents"
          flush="left"
          data-test-subj="docTableRowAction"
          {...props}
        >
          {i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkTextSimple', {
            defaultMessage: 'Surrounding documents',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsHover', {
            defaultMessage:
              'Inspect documents that occurred before and after this document. Only pinned filters remain active in the Surrounding documents view.',
          })}
          type="questionInCircle"
          color="subdued"
          position="right"
          iconProps={{
            className: 'eui-alignTop',
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
