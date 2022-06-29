/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { DocLinksStart, NotificationsStart, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import {
  DataViewField,
  DataView,
  DataPublicPluginStart,
  UsageCollectionStart,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
} from '../shared_imports';
import type { Field, PluginStart, InternalFieldType } from '../types';
import { pluginName } from '../constants';
import { getLinks, ApiService } from '../lib';
import {
  FieldEditorFlyoutContent,
  Props as FieldEditorFlyoutContentProps,
} from './field_editor_flyout_content';
import { FieldEditorProvider } from './field_editor_context';
import { FieldPreviewProvider } from './preview';

export interface Props {
  /** Handler for the "save" footer button */
  onSave: (field: DataViewField[]) => void;
  /** Handler for the "cancel" footer button */
  onCancel: () => void;
  onMounted?: FieldEditorFlyoutContentProps['onMounted'];
  /** The docLinks start service from core */
  docLinks: DocLinksStart;
  /** The index pattern where the field will be added  */
  dataView: DataView;
  /** The Kibana field type of the field to create or edit (default: "runtime") */
  fieldTypeToProcess: InternalFieldType;
  /** Optional field to edit */
  field?: Field;
  /** Services */
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
  search: DataPublicPluginStart['search'];
  usageCollection: UsageCollectionStart;
  apiService: ApiService;
  /** Field format */
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: FieldFormatsStart;
  uiSettings: CoreStart['uiSettings'];
}

/**
 * The container component will be in charge of the communication with the index pattern service
 * to retrieve/save the field in the saved object.
 * The <FieldEditorFlyoutContent /> component is the presentational component that won't know
 * anything about where a field comes from and where it should be persisted.
 */

export const FieldEditorFlyoutContentContainer = ({
  field,
  onSave,
  onCancel,
  onMounted,
  docLinks,
  fieldTypeToProcess,
  dataView,
  dataViews,
  search,
  notifications,
  usageCollection,
  apiService,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Props) => {
  const [isSaving, setIsSaving] = useState(false);

  const { fields } = dataView;

  const namesNotAllowed = useMemo(() => {
    const fieldNames = dataView.fields.map((fld) => fld.name);
    const runtimeCompositeNames = Object.entries(dataView.getAllRuntimeFields())
      .filter(([, _runtimeField]) => _runtimeField.type === 'composite')
      .map(([_runtimeFieldName]) => _runtimeFieldName);
    return {
      fields: fieldNames,
      runtimeComposites: runtimeCompositeNames,
    };
  }, [dataView]);

  const existingConcreteFields = useMemo(() => {
    const existing: Array<{ name: string; type: string }> = [];

    fields
      .filter((fld) => {
        const isFieldBeingEdited = field?.name === fld.name;
        return !isFieldBeingEdited && fld.isMapped;
      })
      .forEach((fld) => {
        existing.push({
          name: fld.name,
          type: (fld.esTypes && fld.esTypes[0]) || '',
        });
      });

    return existing;
  }, [fields, field]);

  const services = useMemo(
    () => ({
      api: apiService,
      search,
      notifications,
    }),
    [apiService, search, notifications]
  );

  const updateRuntimeField = useCallback(
    (updatedField: Field): DataViewField[] => {
      const nameHasChanged = Boolean(field) && field!.name !== updatedField.name;
      const typeHasChanged = Boolean(field) && field!.type !== updatedField.type;
      const hasChangeToOrFromComposite =
        typeHasChanged && (field!.type === 'composite' || updatedField.type === 'composite');

      if (nameHasChanged || hasChangeToOrFromComposite) {
        // Rename an existing runtime field or the type has changed from being a "composite"
        // to any other type or from any other type to "composite"
        dataView.removeRuntimeField(field!.name);
      }

      return dataView.addRuntimeField(updatedField.name, updatedField);
    },
    [field, dataView]
  );

  const updateConcreteField = useCallback(
    (updatedField: Field): DataViewField[] => {
      const editedField = dataView.getFieldByName(updatedField.name);

      if (!editedField) {
        throw new Error(
          `Unable to find field named '${updatedField.name}' on index pattern '${dataView.title}'`
        );
      }

      // Update custom label, popularity and format
      dataView.setFieldCustomLabel(updatedField.name, updatedField.customLabel);

      editedField.count = updatedField.popularity || 0;
      if (updatedField.format) {
        dataView.setFieldFormat(updatedField.name, updatedField.format!);
      } else {
        dataView.deleteFieldFormat(updatedField.name);
      }

      return [editedField];
    },
    [dataView]
  );

  const saveField = useCallback(
    async (updatedField: Field) => {
      try {
        usageCollection.reportUiCounter(
          pluginName,
          METRIC_TYPE.COUNT,
          fieldTypeToProcess === 'runtime' ? 'save_runtime' : 'save_concrete'
        );
        // eslint-disable-next-line no-empty
      } catch {}

      setIsSaving(true);

      try {
        const afterSave = () => {
          const editedFields: DataViewField[] =
            fieldTypeToProcess === 'runtime'
              ? updateRuntimeField(updatedField)
              : updateConcreteField(updatedField as Field);
          const message = i18n.translate('indexPatternFieldEditor.deleteField.savedHeader', {
            defaultMessage: "Saved '{fieldName}'",
            values: { fieldName: updatedField.name },
          });
          notifications.toasts.addSuccess(message);
          setIsSaving(false);
          onSave(editedFields);
        };

        if (dataView.isPersisted()) {
          await dataViews.updateSavedObject(dataView);
        }
        afterSave();

        setIsSaving(false);
      } catch (e) {
        const title = i18n.translate('indexPatternFieldEditor.save.errorTitle', {
          defaultMessage: 'Failed to save field changes',
        });
        notifications.toasts.addError(e, { title });
        setIsSaving(false);
      }
    },
    [
      onSave,
      dataView,
      dataViews,
      notifications,
      fieldTypeToProcess,
      updateConcreteField,
      updateRuntimeField,
      usageCollection,
    ]
  );

  return (
    <FieldEditorProvider
      dataView={dataView}
      uiSettings={uiSettings}
      links={getLinks(docLinks)}
      fieldTypeToProcess={fieldTypeToProcess}
      services={services}
      fieldFormatEditors={fieldFormatEditors}
      fieldFormats={fieldFormats}
      namesNotAllowed={namesNotAllowed}
      existingConcreteFields={existingConcreteFields}
    >
      <FieldPreviewProvider>
        <FieldEditorFlyoutContent
          onSave={saveField}
          onCancel={onCancel}
          onMounted={onMounted}
          field={field}
          isSavingField={isSaving}
        />
      </FieldPreviewProvider>
    </FieldEditorProvider>
  );
};
