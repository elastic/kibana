/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from 'src/core/public';
import { i18n } from '@kbn/i18n';

import {
  createKibanaReactContext,
  toMountPoint,
  IndexPatternField,
  DataPublicPluginStart,
  IndexPattern,
  UsageCollectionStart,
} from './shared_imports';

import type { PluginStart, InternalFieldType, CloseEditor } from './types';
import type { ApiService } from './lib/api';
import { euiFlyoutClassname } from './constants';
import { FieldEditorLoader } from './components/field_editor_loader';

export interface OpenFieldEditorOptions {
  ctx: {
    indexPattern: IndexPattern;
  };
  onSave?: (field: IndexPatternField) => void;
  fieldName?: string;
}

interface Dependencies {
  core: CoreStart;
  /** The search service from the data plugin */
  search: DataPublicPluginStart['search'];
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  apiService: ApiService;
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  usageCollection: UsageCollectionStart;
}

export const getFieldEditorOpener =
  ({
    core,
    indexPatternService,
    fieldFormats,
    fieldFormatEditors,
    search,
    usageCollection,
    apiService,
  }: Dependencies) =>
  (options: OpenFieldEditorOptions): CloseEditor => {
    const { uiSettings, overlays, docLinks, notifications } = core;
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings,
      docLinks,
      http: core.http,
    });

    let overlayRef: OverlayRef | null = null;
    const canCloseValidator = {
      current: () => true,
    };

    const onMounted = (args: { canCloseValidator: () => boolean }) => {
      canCloseValidator.current = args.canCloseValidator;
    };

    const openEditor = ({
      onSave,
      fieldName,
      ctx: { indexPattern },
    }: OpenFieldEditorOptions): CloseEditor => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveField = (updatedField: IndexPatternField) => {
        closeEditor();

        if (onSave) {
          onSave(updatedField);
        }
      };

      const field = fieldName ? indexPattern.getFieldByName(fieldName) : undefined;

      if (fieldName && !field) {
        const err = i18n.translate('indexPatternFieldEditor.noSuchFieldName', {
          defaultMessage: "Field named '{fieldName}' not found on index pattern",
          values: { fieldName },
        });
        notifications.toasts.addDanger(err);
        return closeEditor;
      }

      const isNewRuntimeField = !fieldName;
      const isExistingRuntimeField = field && field.runtimeField && !field.isMapped;
      const fieldTypeToProcess: InternalFieldType =
        isNewRuntimeField || isExistingRuntimeField ? 'runtime' : 'concrete';

      overlayRef = overlays.openFlyout(
        toMountPoint(
          <KibanaReactContextProvider>
            <FieldEditorLoader
              onSave={onSaveField}
              onCancel={closeEditor}
              onMounted={onMounted}
              docLinks={docLinks}
              field={field}
              fieldTypeToProcess={fieldTypeToProcess}
              indexPattern={indexPattern}
              search={search}
              indexPatternService={indexPatternService}
              notifications={notifications}
              usageCollection={usageCollection}
              apiService={apiService}
              fieldFormatEditors={fieldFormatEditors}
              fieldFormats={fieldFormats}
              uiSettings={uiSettings}
            />
          </KibanaReactContextProvider>
        ),
        {
          className: euiFlyoutClassname,
          maxWidth: 708,
          size: 'l',
          ownFocus: true,
          hideCloseButton: true,
          'aria-label': isNewRuntimeField
            ? i18n.translate('indexPatternFieldEditor.createField.flyoutAriaLabel', {
                defaultMessage: 'Create field',
              })
            : i18n.translate('indexPatternFieldEditor.editField.flyoutAriaLabel', {
                defaultMessage: 'Edit {fieldName} field',
                values: {
                  fieldName,
                },
              }),
          onClose: (flyout) => {
            const canClose = canCloseValidator.current();
            if (canClose) {
              flyout.close();
            }
          },
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
