/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiPopover } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';

interface IndexHeaderProps {
  indexPattern: DataView;
  defaultIndex?: string;
  setDefault?: () => void;
  editIndexPatternClick?: () => void;
  deleteIndexPatternClick?: () => void;
  canSave: boolean;
}

const openActionsAriaLabel = i18n.translate('indexPatternManagement.editDataView.openAcionsAria', {
  defaultMessage: 'Open Data View Actions',
});

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

export const IndexHeader: React.FC<IndexHeaderProps> = ({
  defaultIndex,
  indexPattern,
  setDefault,
  editIndexPatternClick,
  deleteIndexPatternClick,
  children,
  canSave,
}) => {
  const [openActions, setOpenActions] = useState<boolean>(false);

  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{indexPattern.getName()}</span>}
      rightSideItems={[
        <EuiPopover
          button={
            <EuiButtonEmpty
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setOpenActions(true)}
              aria-label={openActionsAriaLabel}
              data-test-subj="openDataViewActions"
            >
              Actions
            </EuiButtonEmpty>
          }
          isOpen={openActions}
          closePopover={() => setOpenActions(false)}
          anchorPosition="downRight"
        >
          <EuiFlexGroup
            alignItems="flexStart"
            direction="column"
            onClick={() => setOpenActions(false)}
          >
            {defaultIndex !== indexPattern.id && setDefault && canSave && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  color="text"
                  onClick={setDefault}
                  iconSide="left"
                  iconType="starFilled"
                  aria-label={setDefaultAriaLabel}
                  data-test-subj="setDefaultIndexPatternButton"
                  size="s"
                >
                  {setDefaultTooltip}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {canSave && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  color="text"
                  onClick={editIndexPatternClick}
                  iconSide="left"
                  iconType="pencil"
                  aria-label={editAriaLabel}
                  data-test-subj="editIndexPatternButton"
                  size="s"
                >
                  {editTooltip}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {canSave && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  color="danger"
                  onClick={deleteIndexPatternClick}
                  iconSide="left"
                  iconType="trash"
                  aria-label={removeAriaLabel}
                  data-test-subj="deleteIndexPatternButton"
                  size="s"
                >
                  {removeTooltip}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPopover>,
      ].filter(Boolean)}
    >
      {children}
    </EuiPageHeader>
  );
};
