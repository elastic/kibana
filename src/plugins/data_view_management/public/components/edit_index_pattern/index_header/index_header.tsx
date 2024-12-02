/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiPageHeader } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';

interface IndexHeaderProps {
  indexPattern: DataView;
  defaultIndex?: string;
  dataViewName?: string;
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
  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{indexPattern.getName()}</span>}
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
        defaultIndex !== indexPattern.id && setDefault && canSave && indexPattern.isPersisted() && (
          <EuiButton
            onClick={setDefault}
            iconType="starFilled"
            aria-label={setDefaultAriaLabel}
            data-test-subj="setDefaultIndexPatternButton"
          >
            {setDefaultTooltip}
          </EuiButton>
        ),
        canSave && indexPattern.isPersisted() && (
          <EuiButtonEmpty
            color="danger"
            onClick={deleteIndexPatternClick}
            iconType="trash"
            aria-label={removeAriaLabel}
            data-test-subj="deleteIndexPatternButton"
          >
            {removeTooltip}
          </EuiButtonEmpty>
        ),
      ].filter(Boolean)}
    >
      {children}
    </EuiPageHeader>
  );
};
