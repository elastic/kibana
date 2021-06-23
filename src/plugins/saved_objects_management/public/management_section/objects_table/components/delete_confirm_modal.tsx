/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
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
  EuiCallOut,
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
  const undeletableObjects = useMemo(() => {
    return selectedObjects.filter((obj) => obj.meta.hiddenType);
  }, [selectedObjects]);
  const deletableObjects = useMemo(() => {
    return selectedObjects.filter((obj) => !obj.meta.hiddenType);
  }, [selectedObjects]);

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
        {undeletableObjects.length > 0 && (
          <>
            <EuiCallOut
              data-test-subj="cannotDeleteObjectsConfirmWarning"
              title={
                <FormattedMessage
                  id="savedObjectsManagement.objectsTable.deleteConfirmModal.cannotDeleteCallout.title"
                  defaultMessage="Some objects cannot deleted"
                />
              }
              iconType="alert"
              color="warning"
            >
              <p>
                <FormattedMessage
                  id="savedObjectsManagement.objectsTable.deleteConfirmModal.cannotDeleteCallout.content"
                  defaultMessage="Some of the selected objects cannot be deleted, and are not listed in the table summary"
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <p>
          <FormattedMessage
            id="savedObjectsManagement.deleteSavedObjectsConfirmModalDescription"
            defaultMessage="This action will delete the following saved objects:"
          />
        </p>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          items={deletableObjects}
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
  );
};
