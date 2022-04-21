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

import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import {
  DataViewField,
  DataView,
  DataPublicPluginStart,
  RuntimeType,
  UsageCollectionStart,
  DataViewsPublicPluginStart,
} from '../shared_imports';
import type { Field, PluginStart, InternalFieldType } from '../types';
import { pluginName } from '../constants';
import { deserializeField, getLinks, ApiService } from '../lib';
import {
  FieldEditorFlyoutContent,
  Props as FieldEditorFlyoutContentProps,
} from './field_editor_flyout_content';
import { FieldEditorProvider } from './field_editor_context';
import { FieldPreviewProvider } from './preview';

export interface Props {
  /** Handler for the "save" footer button */
  onSave: (field: DataViewField) => void;
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
  field?: DataViewField;
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
  const fieldToEdit = deserializeField(dataView, field);
  const [isSaving, setIsSaving] = useState(false);

  const { fields } = dataView;

  const namesNotAllowed = useMemo(() => fields.map((fld) => fld.name), [fields]);

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

  const saveField = useCallback(
    async (updatedField: Field) => {
      setIsSaving(true);

      const { script } = updatedField;

      if (fieldTypeToProcess === 'runtime') {
        try {
          usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'save_runtime');
          // eslint-disable-next-line no-empty
        } catch {}
        // rename an existing runtime field
        if (field?.name && field.name !== updatedField.name) {
          dataView.removeRuntimeField(field.name);
        }

        dataView.addRuntimeField(updatedField.name, {
          type: updatedField.type as RuntimeType,
          script,
        });
      } else {
        try {
          usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'save_concrete');
          // eslint-disable-next-line no-empty
        } catch {}
      }

      const editedField = dataView.getFieldByName(updatedField.name);

      try {
        if (!editedField) {
          throw new Error(
            `Unable to find field named '${updatedField.name}' on index pattern '${dataView.title}'`
          );
        }

        dataView.setFieldCustomLabel(updatedField.name, updatedField.customLabel);
        editedField.count = updatedField.popularity || 0;
        if (updatedField.format) {
          dataView.setFieldFormat(updatedField.name, updatedField.format);
        } else {
          dataView.deleteFieldFormat(updatedField.name);
        }

        await dataViews.updateSavedObject(dataView).then(() => {
          const message = i18n.translate('indexPatternFieldEditor.deleteField.savedHeader', {
            defaultMessage: "Saved '{fieldName}'",
            values: { fieldName: updatedField.name },
          });
          notifications.toasts.addSuccess(message);
          setIsSaving(false);
          onSave(editedField);
        });
      } catch (e) {
        const title = i18n.translate('indexPatternFieldEditor.save.errorTitle', {
          defaultMessage: 'Failed to save field changes',
        });
        notifications.toasts.addError(e, { title });
        setIsSaving(false);
      }
    },
    [onSave, dataView, dataViews, notifications, fieldTypeToProcess, field?.name, usageCollection]
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
          field={fieldToEdit}
          isSavingField={isSaving}
        />
      </FieldPreviewProvider>
    </FieldEditorProvider>
  );
};
