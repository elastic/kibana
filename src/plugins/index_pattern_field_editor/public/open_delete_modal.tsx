/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart } from '../../../core/public';
import type { OverlayRef } from '../../../core/public/overlays/types';
import { IndexPattern } from '../../data/common/index_patterns/index_patterns/index_pattern';
import type { DataPublicPluginStart } from '../../data/public/types';
import { toMountPoint } from '../../kibana_react/public/util/to_mount_point';
import type { UsageCollectionStart } from '../../usage_collection/public/plugin';
import { DeleteFieldModal } from './components/confirm_modals/delete_field_modal';
import { removeFields } from './lib/remove_fields';
import type { CloseEditor } from './types';

export interface OpenFieldDeleteModalOptions {
  ctx: {
    indexPattern: IndexPattern;
  };
  onDelete?: (fieldNames: string[]) => void;
  fieldName: string | string[];
}

interface Dependencies {
  core: CoreStart;
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  usageCollection: UsageCollectionStart;
}

export const getFieldDeleteModalOpener = ({
  core,
  indexPatternService,
  usageCollection,
}: Dependencies) => (options: OpenFieldDeleteModalOptions): CloseEditor => {
  const { overlays, notifications } = core;

  let overlayRef: OverlayRef | null = null;

  const openDeleteModal = ({
    onDelete,
    fieldName,
    ctx: { indexPattern },
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

      await removeFields(fieldsToDelete, indexPattern, {
        indexPatternService,
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
        />
      )
    );

    return closeModal;
  };

  return openDeleteModal(options);
};
