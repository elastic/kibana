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
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FieldEditorLoader } from './components/field_editor_loader';
import { euiFlyoutClassname } from './constants';
import type { ApiService } from './lib/api';
import type {
  DataPublicPluginStart,
  UsageCollectionStart,
  RuntimeType,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
  DataViewField,
  DataViewLazy,
} from './shared_imports';
import { DataView } from './shared_imports';
import { createKibanaReactContext } from './shared_imports';
import type { CloseEditor, Field, InternalFieldType, PluginStart } from './types';

/**
 * Options for opening the field editor
 * @public
 */
export interface OpenFieldEditorOptions {
  /**
   * context containing the data view the field belongs to
   */
  ctx: {
    dataView: DataView | DataViewLazy;
  };
  /**
   * action to take after field is saved
   * @param field - the fields that were saved
   */
  onSave?: (field: DataViewField[]) => void;
  /**
   * field to edit, for existing field
   */
  fieldName?: string;
  /**
   * pre-selectable options for new field creation
   */
  fieldToCreate?: Field;
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
  async (options: OpenFieldEditorOptions): Promise<CloseEditor> => {
    const { uiSettings, overlays, docLinks, notifications, settings, theme } = core;
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings,
      docLinks,
      http: core.http,
      settings,
      theme,
    });

    let overlayRef: OverlayRef | null = null;
    const canCloseValidator = {
      current: () => true,
    };

    const onMounted = (args: { canCloseValidator: () => boolean }) => {
      canCloseValidator.current = args.canCloseValidator;
    };

    const openEditor = async ({
      onSave,
      fieldName: fieldNameToEdit,
      fieldToCreate,
      ctx: { dataView: dataViewLazyOrNot },
    }: OpenFieldEditorOptions): Promise<CloseEditor> => {
      const closeEditor = () => {
        if (overlayRef) {
          overlayRef.close();
          overlayRef = null;
        }
      };

      const onSaveField = (updatedField: DataViewField[]) => {
        closeEditor();

        if (onSave) {
          onSave(updatedField);
        }
      };

      const getRuntimeField = (name: string) => {
        const fld = dataViewLazyOrNot.getAllRuntimeFields()[name];
        return {
          name,
          runtimeField: fld,
          isMapped: false,
          esTypes: [],
          type: undefined,
          customLabel: undefined,
          customDescription: undefined,
          count: undefined,
          spec: {
            parentName: undefined,
          },
        };
      };

      const dataView =
        dataViewLazyOrNot instanceof DataView
          ? dataViewLazyOrNot
          : await dataViews.toDataView(dataViewLazyOrNot);

      const dataViewField = fieldNameToEdit
        ? dataView.getFieldByName(fieldNameToEdit) || getRuntimeField(fieldNameToEdit)
        : undefined;

      if (fieldNameToEdit && !dataViewField) {
        const err = i18n.translate('indexPatternFieldEditor.noSuchFieldName', {
          defaultMessage: "Field named ''{fieldName}'' not found on index pattern",
          values: { fieldName: fieldNameToEdit },
        });
        notifications.toasts.addDanger(err);
        return closeEditor;
      }

      const isNewRuntimeField = !fieldNameToEdit;
      const isExistingRuntimeField =
        dataViewField &&
        dataViewField.runtimeField &&
        !dataViewField.isMapped &&
        // treat composite subfield instances as mapped fields for field editing purposes
        (dataViewField.runtimeField.type !== ('composite' as RuntimeType) || !dataViewField.type);

      const fieldTypeToProcess: InternalFieldType =
        isNewRuntimeField || isExistingRuntimeField ? 'runtime' : 'concrete';

      let field: Field | undefined;
      if (dataViewField) {
        if (isExistingRuntimeField) {
          // Runtime field
          field = {
            name: fieldNameToEdit!,
            customLabel: dataViewField.customLabel,
            customDescription: dataViewField.customDescription,
            popularity: dataViewField.count,
            format: dataView.getFormatterForFieldNoDefault(fieldNameToEdit!)?.toJSON(),
            ...dataView.getRuntimeField(fieldNameToEdit!)!,
          };
        } else {
          // Concrete field
          field = {
            name: fieldNameToEdit!,
            type: (dataViewField?.esTypes ? dataViewField.esTypes[0] : 'keyword') as RuntimeType,
            customLabel: dataViewField.customLabel,
            customDescription: dataViewField.customDescription,
            popularity: dataViewField.count,
            format: dataView.getFormatterForFieldNoDefault(fieldNameToEdit!)?.toJSON(),
            parentName: dataViewField.spec.parentName,
          };
        }
      }
      overlayRef = overlays.openFlyout(
        toMountPoint(
          <KibanaReactContextProvider>
            <FieldEditorLoader
              onSave={onSaveField}
              onCancel={closeEditor}
              onMounted={onMounted}
              docLinks={docLinks}
              fieldToEdit={field}
              fieldToCreate={fieldToCreate}
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
          core
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
                  fieldName: fieldNameToEdit,
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
            // // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
            style: 'z-index: 1003', // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
          },
        }
      );

      return closeEditor;
    };

    return openEditor(options);
  };
