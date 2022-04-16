/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart, OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import {
  createKibanaReactContext,
  toMountPoint,
  DataViewField,
  DataPublicPluginStart,
  DataView,
  UsageCollectionStart,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
  RuntimeType,
} from './shared_imports';

import type { PluginStart, InternalFieldType, CloseEditor } from './types';
import type { ApiService } from './lib/api';
import { euiFlyoutClassname } from './constants';
import { FieldEditorLoader } from './components/field_editor_loader';

export interface OpenFieldEditorOptions {
  ctx: {
    dataView: DataView;
  };
  onSave?: (field: DataViewField) => void;
  fieldName?: string;
}

interface Dependencies {
  core: CoreStart;
  /** The search service from the data plugin */
  search: DataPublicPluginStart['search'];
  dataViews: DataViewsPublicPluginStart;
  apiService: ApiService;
  fieldFormats: FieldFormatsStart;
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  usageCollection: UsageCollectionStart;
}

export const getFieldEditorOpener =
  ({
    core,
    dataViews,
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
      ctx: { dataView },
    }: OpenFieldEditorOptions): CloseEditor => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveField = (updatedField: DataViewField) => {
        closeEditor();

        if (onSave) {
          onSave(updatedField);
        }
      };

      const field = fieldName ? dataView.getFieldByName(fieldName) : undefined;

      if (fieldName && !field) {
        const err = i18n.translate('indexPatternFieldEditor.noSuchFieldName', {
          defaultMessage: "Field named '{fieldName}' not found on index pattern",
          values: { fieldName },
        });
        notifications.toasts.addDanger(err);
        return closeEditor;
      }

      const isNewRuntimeField = !fieldName;
      const isExistingRuntimeField =
        field &&
        field.runtimeField &&
        !field.isMapped &&
        // treat composite field instances as mapped fields for field editing purposes
        field.runtimeField.type !== ('composite' as RuntimeType);
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
              dataView={dataView}
              search={search}
              dataViews={dataViews}
              notifications={notifications}
              usageCollection={usageCollection}
              apiService={apiService}
              fieldFormatEditors={fieldFormatEditors}
              fieldFormats={fieldFormats}
              uiSettings={uiSettings}
            />
          </KibanaReactContextProvider>,
          { theme$: core.theme.theme$ }
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
          maskProps: {
            className: 'indexPatternFieldEditorMaskOverlay',
          },
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
