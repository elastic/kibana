/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalHeaderTitle,
  EuiModalHeader,
  EuiModalBody,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function LoadSavedFilterSetModal({
  onCancel,
  applySavedQueries,
  savedQueryManagement,
}: {
  applySavedQueries: () => void;
  onCancel: () => void;
  savedQueryManagement?: JSX.Element;
}) {
  const onAddFilter = () => {
    applySavedQueries();
  };

  return (
    <EuiModal maxWidth={800} onClose={onCancel} className="kbnQueryBar--addFilterModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h3>
            {i18n.translate('data.filter.loadSavedFilterSetModal.headerTitle', {
              defaultMessage: 'Load filter set',
            })}
          </h3>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiHorizontalRule margin="none" />

      <EuiModalBody className="kbnQueryBar__filterModalWrapper">
        {savedQueryManagement}
      </EuiModalBody>
      <EuiHorizontalRule margin="none" />
      <EuiModalFooter>
        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel}>
                  {i18n.translate('data.filter.loadSavedFilterSetModal.cancelLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="plusInCircleFilled"
                  fill
                  onClick={onAddFilter}
                  data-test-subj="canvasCustomElementForm-submit"
                >
                  {i18n.translate('data.filter.addFilterModal.addFilterBtnLabel', {
                    defaultMessage: 'Add filter',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
