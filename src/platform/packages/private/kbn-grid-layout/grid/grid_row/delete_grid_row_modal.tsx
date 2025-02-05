/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { GridLayoutStateManager } from '../types';
import { deleteRow, movePanelsToRow } from '../utils/row_management';

export const DeleteGridRowModal = ({
  rowIndex,
  gridLayoutStateManager,
  setDeleteModalVisible,
}: {
  rowIndex: number;
  gridLayoutStateManager: GridLayoutStateManager;
  setDeleteModalVisible: (visible: boolean) => void;
}) => {
  return (
    <EuiModal
      onClose={() => {
        setDeleteModalVisible(false);
      }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>Delete section</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {i18n.translate('kbnGridLayout.deleteGridRowModal.body', {
          defaultMessage:
            'Are you sure you want to remove this section and its {panelCount} {panelCount, plural, one {panel} other {panels}}?',
          values: {
            panelCount: Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels)
              .length,
          },
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={() => {
            setDeleteModalVisible(false);
          }}
        >
          {i18n.translate('kbnGridLayout.deleteGridRowModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={() => {
            setDeleteModalVisible(false);
            const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), rowIndex);
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          fill
          color="danger"
        >
          {i18n.translate('kbnGridLayout.deleteGridRowModal.confirmDeleteAllPanels', {
            defaultMessage: 'Yes',
          })}
        </EuiButton>
        <EuiButton
          onClick={() => {
            setDeleteModalVisible(false);
            let newLayout = movePanelsToRow(
              gridLayoutStateManager.gridLayout$.getValue(),
              rowIndex,
              0
            );
            newLayout = deleteRow(newLayout, rowIndex);
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          fill
        >
          {i18n.translate('kbnGridLayout.deleteGridRowModal.confirmDeleteSection', {
            defaultMessage: 'Delete section only',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
