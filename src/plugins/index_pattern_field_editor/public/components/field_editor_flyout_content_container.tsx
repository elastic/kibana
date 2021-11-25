/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { DocLinksStart, NotificationsStart, CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import {
  IndexPatternField,
  IndexPattern,
  DataPublicPluginStart,
  UsageCollectionStart,
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
  onSave: (field: IndexPatternField[]) => void;
  /** Handler for the "cancel" footer button */
  onCancel: () => void;
  onMounted?: FieldEditorFlyoutContentProps['onMounted'];
  /** The docLinks start service from core */
  docLinks: DocLinksStart;
  /** The index pattern where the field will be added  */
  indexPattern: IndexPattern;
  /** The Kibana field type of the field to create or edit (default: "runtime") */
  fieldTypeToProcess: InternalFieldType;
  /** Optional field to edit */
  field?: Field;
  /** Services */
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  notifications: NotificationsStart;
  search: DataPublicPluginStart['search'];
  usageCollection: UsageCollectionStart;
  apiService: ApiService;
  /** Field format */
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
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
  indexPattern,
  indexPatternService,
  search,
  notifications,
  usageCollection,
  apiService,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Props) => {
  const [isSaving, setIsSaving] = useState(false);

  const { fields } = indexPattern;

  const namesNotAllowed = useMemo(() => {
    const fieldNames = indexPattern.fields.map((fld) => fld.name);
    const runtimeCompositeNames = Object.entries(indexPattern.getAllRuntimeFields())
      .filter(([, _runtimeField]) => _runtimeField.type === 'composite')
      .map(([_runtimeFieldName]) => _runtimeFieldName);
    return {
      fields: fieldNames,
      runtimeComposites: runtimeCompositeNames,
    };
  }, [indexPattern]);

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
    (updatedField: Field): IndexPatternField[] => {
      const nameHasChanged = Boolean(field) && field!.name !== updatedField.name;
      const typeHasChanged = Boolean(field) && field!.type !== updatedField.type;
      const hasChangeToOrFromComposite =
        typeHasChanged && (field!.type === 'composite' || updatedField.type === 'composite');

      if (nameHasChanged || hasChangeToOrFromComposite) {
        // Rename an existing runtime field or the type has changed from being a "composite"
        // to any other type or from any other type to "composite"
        indexPattern.removeRuntimeField(field!.name);
      }

      return indexPattern.addRuntimeField(updatedField.name, updatedField);
    },
    [field, indexPattern]
  );

  const updateConcreteField = useCallback(
    (updatedField: Field): IndexPatternField[] => {
      const editedField = indexPattern.getFieldByName(updatedField.name);

      if (!editedField) {
        throw new Error(
          `Unable to find field named '${updatedField.name}' on index pattern '${indexPattern.title}'`
        );
      }

      // Update custom label, popularity and format
      indexPattern.setFieldCustomLabel(updatedField.name, updatedField.customLabel);

      editedField.count = updatedField.popularity || 0;
      if (updatedField.format) {
        indexPattern.setFieldFormat(updatedField.name, updatedField.format!);
      } else {
        indexPattern.deleteFieldFormat(updatedField.name);
      }

      return [editedField];
    },
    [indexPattern]
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
        const editedFields: IndexPatternField[] =
          fieldTypeToProcess === 'runtime'
            ? updateRuntimeField(updatedField)
            : updateConcreteField(updatedField as Field);

        await indexPatternService.updateSavedObject(indexPattern);

        const message = i18n.translate('indexPatternFieldEditor.deleteField.savedHeader', {
          defaultMessage: "Saved '{fieldName}'",
          values: { fieldName: updatedField.name },
        });
        notifications.toasts.addSuccess(message);

        setIsSaving(false);
        onSave(editedFields);
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
      indexPattern,
      indexPatternService,
      notifications,
      fieldTypeToProcess,
      updateConcreteField,
      updateRuntimeField,
      usageCollection,
    ]
  );

  return (
    <FieldEditorProvider
      indexPattern={indexPattern}
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
