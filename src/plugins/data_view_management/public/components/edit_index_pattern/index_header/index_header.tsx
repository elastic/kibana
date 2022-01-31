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
import { DataView } from 'src/plugins/data_views/public';

interface IndexHeaderProps {
  indexPattern: DataView;
  defaultIndex?: string;
  setDefault?: () => void;
  editIndexPatternClick?: () => void;
  deleteIndexPatternClick?: () => void;
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

export const IndexHeader: React.FC<IndexHeaderProps> = ({
  defaultIndex,
  indexPattern,
  setDefault,
  editIndexPatternClick,
  deleteIndexPatternClick,
  children,
}) => {
  const [openActions, setOpenActions] = useState<boolean>(false);

  const title = indexPattern.readableTitle ? indexPattern.readableTitle : indexPattern.title;

  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{title}</span>}
      description={
        indexPattern.readableTitleDescription ? indexPattern.readableTitleDescription : null
      }
      rightSideItems={[
        <EuiPopover
          button={
            <EuiButtonEmpty
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setOpenActions(true)}
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
            {defaultIndex !== indexPattern.id && setDefault && (
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
            {editIndexPatternClick && (
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
            {deleteIndexPatternClick && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  color="text"
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
