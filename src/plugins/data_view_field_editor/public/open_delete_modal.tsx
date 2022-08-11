/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from '@kbn/core/public';

import {
  toMountPoint,
  DataViewsPublicPluginStart,
  DataView,
  UsageCollectionStart,
} from './shared_imports';

import { CloseEditor } from './types';

import { DeleteFieldModal } from './components/confirm_modals/delete_field_modal';
import { removeFields } from './lib/remove_fields';

export interface OpenFieldDeleteModalOptions {
  ctx: {
    dataView: DataView;
  };
  onDelete?: (fieldNames: string[]) => void;
  fieldName: string | string[];
}

interface Dependencies {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
  usageCollection: UsageCollectionStart;
}

export const getFieldDeleteModalOpener =
  ({ core, dataViews, usageCollection }: Dependencies) =>
  (options: OpenFieldDeleteModalOptions): CloseEditor => {
    const { overlays, notifications } = core;

    let overlayRef: OverlayRef | null = null;

    const openDeleteModal = ({
      onDelete,
      fieldName,
      ctx: { dataView },
    }: OpenFieldDeleteModalOptions): CloseEditor => {
      const fieldsToDelete = Array.isArray(fieldName) ? fieldName : [fieldName];
      const closeModal = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onConfirmDelete = async () => {
        closeModal();

        await removeFields(fieldsToDelete, dataView, {
          dataViews,
          usageCollection,
          notifications,
        });

        if (onDelete) {
          onDelete(fieldsToDelete);
        }
      };

      overlayRef = overlays.openModal(
        toMountPoint(
          <DeleteFieldModal
            fieldsToDelete={fieldsToDelete}
            closeModal={closeModal}
            confirmDelete={onConfirmDelete}
          />,
          { theme$: core.theme.theme$ }
        )
      );

      return closeModal;
    };

    return openDeleteModal(options);
  };
