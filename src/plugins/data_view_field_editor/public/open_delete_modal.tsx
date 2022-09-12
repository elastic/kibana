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

/**
 * Options for opening the field editor
 */
export interface OpenFieldDeleteModalOptions {
  /**
   * Config for the delete modal
   */
  ctx: {
    dataView: DataView;
  };
  /**
   * Callback fired when fields are deleted
   * @param fieldNames - the names of the deleted fields
   */
  onDelete?: (fieldNames: string[]) => void;
  /**
   * Names of the fields to be deleted
   */
  fieldName: string | string[];
}

interface Dependencies {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
  usageCollection: UsageCollectionStart;
}

/**
 * Error throw when there's an attempt to directly delete a composite subfield
 * @param fieldName - the name of the field to delete
 */
export class DeleteCompositeSubfield extends Error {
  constructor(fieldName: string) {
    super(`Field '${fieldName} cannot be deleted because it is a composite subfield.`);
  }
}

export const getFieldDeleteModalOpener =
  ({ core, dataViews, usageCollection }: Dependencies) =>
  (options: OpenFieldDeleteModalOptions): CloseEditor => {
    if (typeof options.fieldName === 'string') {
      const fieldToDelete = options.ctx.dataView.getFieldByName(options.fieldName);
      // we can check for composite type since composite runtime field definitions themselves don't become fields
      const doesBelongToCompositeField = fieldToDelete?.runtimeField?.type === 'composite';

      if (doesBelongToCompositeField) {
        throw new DeleteCompositeSubfield(options.fieldName);
      }
    }

    const { overlays, notifications } = core;

    let overlayRef: OverlayRef | null = null;

    /**
     * Open the delete field modal
     * @param Options for delete field modal
     * @returns Function to close the delete field modal
     */
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
