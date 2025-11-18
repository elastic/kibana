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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import { DeleteModalContent } from './delete_data_view_flyout_content';
import type { IndexPatternManagmentContext } from '../../types';

export interface RemoveDataViewProps {
  id: string;
  title: string;
  namespaces?: string[] | undefined;
  name?: string;
  getName: () => string;
}

interface RemoveDataViewDeps {
  dataViews: DataViewsPublicPluginStart;
  dataViewArray: RemoveDataViewProps[];
  selectedRelationships: Record<string, SavedObjectRelation[]>;
  hasSpaces: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export const DeleteDataViewFlyout = ({
  dataViews,
  dataViewArray,
  selectedRelationships,
  hasSpaces,
  onDelete,
  onClose,
}: RemoveDataViewDeps) => {
  const { notifications } = useKibana<IndexPatternManagmentContext>().services;
  const [reviewedItems, setReviewedItems] = React.useState<Set<string>>(new Set());

  const onModalClose = () => {
    setReviewedItems(new Set());
    onClose();
  };

  const deleteDataViews = async () => {
    asyncForEach(dataViewArray, async ({ id }) => dataViews.delete(id))
      .then(() => {
        onDelete();
        notifications.toasts.addSuccess(
          i18n.translate('indexPatternManagement.dataViewTable.deleteSuccessToast', {
            defaultMessage:
              'Successfully deleted {count, number} {count, plural, one {data view} other {data views}}.',
            values: { count: dataViewArray.length },
          })
        );
      })
      .catch((error) => {
        notifications.toasts.addDanger(error);
      });
  };

  const complicatedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'deleteDataViewFlyoutTitle',
  });

  const disableDeleteButton = React.useMemo(() => {
    return (
      reviewedItems.size !==
      Object.values(selectedRelationships).filter((relations) => relations.length > 0).length
    );
  }, [reviewedItems, selectedRelationships]);

  return (
    <EuiFlyout
      onClose={onModalClose}
      data-test-subj="deleteDataViewFlyout"
      aria-label="deleteDataViewFlyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="deleteDataViewFlyoutHeader">
        <EuiTitle size="m">
          <h2 id={complicatedFlyoutTitleId}>
            {i18n.translate('indexPatternManagement.deleteDataView.flyoutTitle', {
              defaultMessage: 'Delete Data View',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="delete-modal-content">
        <DeleteModalContent
          reviewedItems={reviewedItems}
          setReviewedItems={setReviewedItems}
          views={dataViewArray}
          hasSpaces={hasSpaces}
          relationships={selectedRelationships}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onModalClose} flush="left">
              {i18n.translate('indexPatternManagement.deleteDataView.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={deleteDataViews}
              color="danger"
              fill
              disabled={disableDeleteButton}
              data-test-subj="confirmFlyoutConfirmButton"
            >
              {i18n.translate('indexPatternManagement.deleteDataView.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
