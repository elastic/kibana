/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren, ReactElement } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPageHeader,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

interface IndexHeaderProps {
  indexPattern: DataView;
  defaultIndex?: string;
  setDefault?: () => void;
  editIndexPatternClick?: () => void;
  deleteIndexPatternClick?: () => void;
  refreshIndexPatternClick?: () => void;
  canSave: boolean;
  isRefreshing?: boolean;
}

const setDefaultAriaLabel = i18n.translate('indexPatternManagement.editDataView.setDefaultAria', {
  defaultMessage: 'Set as default data view.',
});

const setDefaultTooltip = i18n.translate('indexPatternManagement.editDataView.setDefaultTooltip', {
  defaultMessage: 'Set as default',
});

const editAriaLabel = i18n.translate('indexPatternManagement.editDataView.editAria', {
  defaultMessage: 'Edit data view.',
});

const editTooltip = i18n.translate('indexPatternManagement.editDataView.editTooltip', {
  defaultMessage: 'Edit',
});

const removeAriaLabel = i18n.translate('indexPatternManagement.editDataView.removeAria', {
  defaultMessage: 'Delete data view.',
});

const removeTooltip = i18n.translate('indexPatternManagement.editDataView.removeTooltip', {
  defaultMessage: 'Delete',
});

export const IndexHeader: FC<PropsWithChildren<IndexHeaderProps>> = ({
  defaultIndex,
  indexPattern,
  setDefault,
  editIndexPatternClick,
  deleteIndexPatternClick,
  children,
  canSave,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const contextMenuItems = [
    canSave && (
      <EuiContextMenuItem
        onClick={editIndexPatternClick}
        icon="pencil"
        aria-label={editAriaLabel}
        data-test-subj="editIndexPatternButton"
        color="primary"
      >
        <EuiText size="s" color="primary">
          {editTooltip}
        </EuiText>
      </EuiContextMenuItem>
    ),
    defaultIndex !== indexPattern.id && setDefault && canSave && indexPattern.isPersisted() && (
      <EuiContextMenuItem
        onClick={setDefault}
        icon="starFilled"
        aria-label={setDefaultAriaLabel}
        data-test-subj="setDefaultIndexPatternButton"
      >
        <EuiText size="s">{setDefaultTooltip}</EuiText>
      </EuiContextMenuItem>
    ),
    canSave && indexPattern.isPersisted() && (
      <EuiContextMenuItem
        color="danger"
        onClick={deleteIndexPatternClick}
        icon={<EuiIcon color="danger" type="trash" />}
        aria-label={removeAriaLabel}
        data-test-subj="deleteIndexPatternButton"
      >
        <EuiText size="s" color="danger">
          {removeTooltip}
        </EuiText>
      </EuiContextMenuItem>
    ),
  ].filter(Boolean) as ReactElement[];

  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{indexPattern.getName()}</span>}
      bottomBorder
      rightSideItems={[
        <EuiPopover
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          button={
            <EuiButton
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setIsOpen(!isOpen)}
              size="m"
              data-test-subj="actionsButton"
              aria-label={i18n.translate('indexPatternManagement.editDataView.actionsButtonAria', {
                defaultMessage: 'Actions',
              })}
            >
              <FormattedMessage
                id="indexPatternManagement.editDataView.actionsButtonLabel"
                defaultMessage="Actions"
              />
            </EuiButton>
          }
        >
          <EuiContextMenuPanel items={contextMenuItems} />
        </EuiPopover>,
      ]}
    >
      {children}
    </EuiPageHeader>
  );
};
