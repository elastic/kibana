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

import { useGridLayoutContext } from '../use_grid_layout_context';
import { deleteRow, movePanelsToRow } from '../utils/row_management';

export const DeleteGridRowModal = ({
  sectionId,
  setDeleteModalVisible,
}: {
  sectionId: string;
  setDeleteModalVisible: (visible: boolean) => void;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  return (
    <EuiModal
      onClose={() => {
        setDeleteModalVisible(false);
      }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('kbnGridLayout.deleteGridRowModal.title', {
            defaultMessage: 'Delete section',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {i18n.translate('kbnGridLayout.deleteGridRowModal.body', {
          defaultMessage:
            'Choose to remove the section, including its contents, or only the section.',
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
            const layout = gridLayoutStateManager.gridLayout$.getValue();
            const firstSectionId = Object.values(layout).find(({ order }) => order === 0)?.id;
            if (!firstSectionId) return;
            let newLayout = movePanelsToRow(layout, sectionId, firstSectionId);
            newLayout = deleteRow(newLayout, sectionId);
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          color="danger"
        >
          {i18n.translate('kbnGridLayout.deleteGridRowModal.confirmDeleteSection', {
            defaultMessage: 'Delete section only',
          })}
        </EuiButton>
        <EuiButton
          onClick={() => {
            setDeleteModalVisible(false);
            const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), sectionId);
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          fill
          color="danger"
        >
          {i18n.translate('kbnGridLayout.deleteGridRowModal.confirmDeleteAllPanels', {
            defaultMessage:
              'Delete section and {panelCount} {panelCount, plural, one {panel} other {panels}}',
            values: {
              panelCount: Object.keys(
                gridLayoutStateManager.gridLayout$.getValue()[sectionId].panels
              ).length,
            },
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
