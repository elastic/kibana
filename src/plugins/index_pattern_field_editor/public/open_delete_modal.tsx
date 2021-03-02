/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';

import {
  toMountPoint,
  DataPublicPluginStart,
  IndexPattern,
  UsageCollectionStart,
} from './shared_imports';

import { CloseEditor } from './types';

import { DeleteFieldModal } from './components/delete_field_modal';
import { removeFields } from './lib/remove_fields';

export interface OpenFieldDeleteModalOptions {
  ctx: {
    indexPattern: IndexPattern;
  };
  onDelete?: () => void;
  fieldNames: string[];
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
    fieldNames,
    ctx: { indexPattern },
  }: OpenFieldDeleteModalOptions): CloseEditor => {
    const closeModal = () => {
      if (overlayRef) {
        overlayRef.close();
        overlayRef = null;
      }
    };

    const onConfirmDelete = async () => {
      closeModal();

      await removeFields(fieldNames, indexPattern, {
        indexPatternService,
        usageCollection,
        notifications,
      });

      if (onDelete) {
        onDelete();
      }
    };

    overlayRef = overlays.openModal(
      toMountPoint(
        <DeleteFieldModal
          fieldsToDelete={fieldNames}
          closeModal={closeModal}
          confirmDelete={onConfirmDelete}
        />
      )
    );

    return closeModal;
  };

  return openDeleteModal(options);
};
