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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPageHeader,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';

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
  defaultMessage: 'Edit data view',
});

const removeAriaLabel = i18n.translate('indexPatternManagement.editDataView.removeAria', {
  defaultMessage: 'Delete data view.',
});

const removeTooltip = i18n.translate('indexPatternManagement.editDataView.removeTooltip', {
  defaultMessage: 'Delete data view',
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
    canSave && indexPattern.isPersisted() && deleteIndexPatternClick && (
      <EuiContextMenuItem
        color="danger"
        onClick={() => {
          setIsOpen(false);
          deleteIndexPatternClick();
        }}
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

  const renderMoreActionsButton = () => {
    return (
      <EuiPopover
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        button={
          <EuiButtonIcon
            iconType="boxesVertical"
            onClick={() => setIsOpen((prevIsOpen) => !prevIsOpen)}
            size="m"
            data-test-subj="moreActionsButton"
            aria-label={i18n.translate(
              'indexPatternManagement.editDataView.moreActionsButtonAria',
              {
                defaultMessage: 'More Actions',
              }
            )}
            color="text"
          />
        }
      >
        <EuiContextMenuPanel items={contextMenuItems} />
      </EuiPopover>
    );
  };

  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{indexPattern.getName()}</span>}
      bottomBorder
      rightSideItems={[
        canSave && (
          <EuiButton
            onClick={editIndexPatternClick}
            iconType="pencil"
            aria-label={editAriaLabel}
            data-test-subj="editIndexPatternButton"
            color="primary"
          >
            {editTooltip}
          </EuiButton>
        ),
        contextMenuItems.length > 0 && renderMoreActionsButton(),
        defaultIndex !== indexPattern.id && setDefault && canSave && indexPattern.isPersisted() && (
          <EuiButtonEmpty
            onClick={setDefault}
            iconType="starEmpty"
            aria-label={setDefaultAriaLabel}
            data-test-subj="setDefaultIndexPatternButton"
            color="text"
            flush="both"
          >
            {setDefaultTooltip}
          </EuiButtonEmpty>
        ),
      ].filter(Boolean)}
    >
      {children}
    </EuiPageHeader>
  );
};
