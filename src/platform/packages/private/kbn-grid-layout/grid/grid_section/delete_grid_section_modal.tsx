/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';
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
import { deleteSection, isCollapsibleSection, resolveSections } from '../utils/section_management';
import { MainSection } from './types';

export const DeleteGridSectionModal = ({
  sectionId,
  setDeleteModalVisible,
}: {
  sectionId: string;
  setDeleteModalVisible: (visible: boolean) => void;
}) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  return (
    <EuiModal
      data-test-subj={`kbnGridLayoutDeleteSectionModal-${sectionId}`}
      onClose={() => {
        setDeleteModalVisible(false);
      }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('kbnGridLayout.deleteGridSectionModal.title', {
            defaultMessage: 'Delete section',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {i18n.translate('kbnGridLayout.deleteGridSectionModal.body', {
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
          {i18n.translate('kbnGridLayout.deleteGridSectionModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={() => {
            setDeleteModalVisible(false);
            const layout = gridLayoutStateManager.gridLayout$.getValue();
            const section = layout[sectionId];
            if (!isCollapsibleSection(section)) return; // main sections are not user deletable

            // convert collapsible section to main section so that panels remain in place
            const newLayout = cloneDeep(layout);
            const { title, isCollapsed, ...baseSectionProps } = section;
            const sectionAsMain: MainSection = {
              ...baseSectionProps,
              isMainSection: true,
            };
            newLayout[sectionId] = sectionAsMain;

            gridLayoutStateManager.gridLayout$.next(resolveSections(newLayout));
          }}
          color="danger"
        >
          {i18n.translate('kbnGridLayout.deleteGridSectionModal.confirmDeleteSection', {
            defaultMessage: 'Delete section only',
          })}
        </EuiButton>
        <EuiButton
          onClick={() => {
            setDeleteModalVisible(false);
            const newLayout = deleteSection(
              gridLayoutStateManager.gridLayout$.getValue(),
              sectionId
            );
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          fill
          color="danger"
        >
          {i18n.translate('kbnGridLayout.deleteGridSectionModal.confirmDeleteAllPanels', {
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
