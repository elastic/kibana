/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FC } from 'react';
import {
  EuiInMemoryTable,
  EuiLoadingElastic,
  EuiToolTip,
  EuiIcon,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectWithMetadata } from '../../../../common';
import { getSavedObjectLabel } from '../../../lib';

export interface DeleteConfirmModalProps {
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  selectedObjects: SavedObjectWithMetadata[];
}

export const DeleteConfirmModal: FC<DeleteConfirmModalProps> = ({
  isDeleting,
  onConfirm,
  onCancel,
  selectedObjects,
}) => {
  if (isDeleting) {
    return (
      <EuiOverlayMask>
        <EuiLoadingElastic size="xl" />
      </EuiOverlayMask>
    );
  }

  // can't use `EuiConfirmModal` here as the confirm modal body is wrapped
  // inside a `<p>` element, causing UI glitches with the table.
  return (
    <EuiOverlayMask>
      <EuiModal initialFocus="soDeleteConfirmModalConfirmBtn" onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModalTitle"
              defaultMessage="Delete saved objects"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <p>
            <FormattedMessage
              id="savedObjectsManagement.deleteSavedObjectsConfirmModalDescription"
              defaultMessage="This action will delete the following saved objects:"
            />
          </p>
          <EuiSpacer size="m" />
          <EuiInMemoryTable
            items={selectedObjects}
            columns={[
              {
                field: 'type',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.typeColumnName',
                  { defaultMessage: 'Type' }
                ),
                width: '50px',
                render: (type, object) => (
                  <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
                    <EuiIcon type={object.meta.icon || 'apps'} />
                  </EuiToolTip>
                ),
              },
              {
                field: 'id',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.idColumnName',
                  { defaultMessage: 'Id' }
                ),
              },
              {
                field: 'meta.title',
                name: i18n.translate(
                  'savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.titleColumnName',
                  { defaultMessage: 'Title' }
                ),
              },
            ]}
            pagination={true}
            sorting={false}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onCancel} data-test-subj="confirmModalCancelButton">
                    <FormattedMessage
                      id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.cancelButtonLabel"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    id="soDeleteConfirmModalConfirmBtn"
                    fill
                    color="danger"
                    onClick={onConfirm}
                    data-test-subj="confirmModalConfirmButton"
                  >
                    <FormattedMessage
                      id="savedObjectsManagement.objectsTable.deleteSavedObjectsConfirmModal.deleteButtonLabel"
                      defaultMessage="Delete"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
