/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

function getI18nTexts(items: unknown[], entityName: string, entityNamePlural: string) {
  return {
    deleteBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel',
      {
        defaultMessage: 'Delete',
      }
    ),
    deletingBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.confirmButtonLabelDeleting',
      {
        defaultMessage: 'Deleting',
      }
    ),
    title: i18n.translate('contentManagement.tableList.listing.deleteSelectedConfirmModal.title', {
      defaultMessage: 'Delete {itemCount} {entityName}?',
      values: {
        itemCount: items.length,
        entityName: items.length === 1 ? entityName : entityNamePlural,
      },
    }),
    description: i18n.translate(
      'contentManagement.tableList.listing.deleteConfirmModalDescription',
      {
        defaultMessage: `You can't recover deleted {entityNamePlural}.`,
        values: {
          entityNamePlural,
        },
      }
    ),
    cancelBtnLabel: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
    sharedItemsCallout: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.sharedItemsCallout',
      {
        defaultMessage: `{entityNamePlural} are deleted from every space in which they are shared.`,
        values: {
          entityNamePlural,
        },
      }
    ),
    titleColumnName: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.titleColumnName',
      { defaultMessage: 'Name' }
    ),
    spacesColumnName: i18n.translate(
      'contentManagement.tableList.listing.deleteSelectedItemsConfirmModal.spacesColumnName',
      { defaultMessage: 'Spaces' }
    ),
  };
}

export interface Props<T extends UserContentCommonSchema = UserContentCommonSchema> {
  /** Flag to indicate if the items are being deleted */
  isDeletingItems: boolean;
  /** Array of items to delete */
  items: T[];
  /** The name of the entity to delete (singular) */
  entityName: string;
  /** The name of the entity to delete (plural) */
  entityNamePlural: string;
  /** Handler to be called when clicking the "Cancel" button */
  onCancel: () => void;
  /** Handler to be called when clicking the "Confirm" button */
  onConfirm: () => void;
  /** Spaces plugin API */
  spacesApi?: SpacesApi;
}

export function ConfirmDeleteModal<T extends UserContentCommonSchema>({
  isDeletingItems,
  items,
  entityName,
  entityNamePlural,
  onCancel,
  onConfirm,
  spacesApi,
}: Props<T>) {
  const {
    deleteBtnLabel,
    deletingBtnLabel,
    title,
    description,
    cancelBtnLabel,
    sharedItemsCallout,
    titleColumnName,
    spacesColumnName,
  } = useMemo(
    () => getI18nTexts(items, entityName, entityNamePlural),
    [entityName, entityNamePlural, items]
  );

  const hasSharedItemsSelected = useMemo(() => {
    return items.some((item) =>
      Boolean(item.namespaces && (item.namespaces.length > 1 || item.namespaces.includes('*')))
    );
  }, [items]);

  const hasSpaces = useMemo(() => {
    return Boolean(spacesApi && !spacesApi.hasOnlyDefaultSpace);
  }, [spacesApi]);

  const content = useMemo(() => {
    const columns: Array<EuiTableFieldDataColumnType<T>> = [
      {
        field: 'attributes.title',
        name: titleColumnName,
        sortable: true,
      },
    ];

    if (hasSpaces) {
      const SpacesList = spacesApi!.ui.components.getSpaceList;
      columns.push({
        field: 'namespaces',
        name: spacesColumnName,
        sortable: true,
        width: '100px',
        align: 'left',
        render: (field: string, record: T) => {
          return record.namespaces?.indexOf('*') !== -1 ? 'all' : record.namespaces.length;
          // return (
          // <SpacesList
          //   namespaces={record.namespaces ?? []}
          //   displayLimit={4}
          //   behaviorContext="outside-space"
          // />
          // )
        },
      });
    }
    return (
      <div>
        {hasSharedItemsSelected && hasSpaces && (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              title={sharedItemsCallout}
              data-test-subj={'sharedItemsInDeleteConfirmCallout'}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <div>{description}</div>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          items={items}
          columns={columns}
          pagination={items.length < 10 ? false : true}
          data-test-subj={'itemsInDeleteConfirmTable'}
        />
      </div>
    );
  }, [
    description,
    hasSharedItemsSelected,
    hasSpaces,
    items,
    sharedItemsCallout,
    spacesApi,
    spacesColumnName,
    titleColumnName,
  ]);

  return (
    <EuiConfirmModal
      title={title}
      buttonColor="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelBtnLabel}
      confirmButtonText={isDeletingItems ? deletingBtnLabel : deleteBtnLabel}
      defaultFocusedButton="cancel"
    >
      {content}
    </EuiConfirmModal>
  );
}
