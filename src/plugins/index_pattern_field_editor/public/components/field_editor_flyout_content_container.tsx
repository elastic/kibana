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
import { deserializeField, getRuntimeFieldValidator, getLinks, ApiService } from '../lib';
import {
  FieldEditorFlyoutContent,
  Props as FieldEditorFlyoutContentProps,
} from './field_editor_flyout_content';
import { FieldEditorProvider } from './field_editor_context';
import { FieldPreviewProvider } from './preview';

export interface Props {
  /** Handler for the "save" footer button */
  onSave: (field: IndexPatternField) => void;
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
  field?: IndexPatternField;
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
  const fieldToEdit = deserializeField(indexPattern, field);
  const [isSaving, setIsSaving] = useState(false);

  const { fields } = indexPattern;

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

  const validateRuntimeField = useMemo(() => getRuntimeFieldValidator(indexPattern.title, search), [
    search,
    indexPattern,
  ]);

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

      if (fieldTypeToProcess === 'runtime') {
        try {
          usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'save_runtime');
          // eslint-disable-next-line no-empty
        } catch {}

        // rename an existing runtime field
        if (field?.name && field.name !== updatedField.name) {
          indexPattern.removeRuntimeField(field.name);
        }

        indexPattern.addRuntimeField(updatedField.name, updatedField);
      } else {
        try {
          usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'save_concrete');
          // eslint-disable-next-line no-empty
        } catch {}
      }

      try {
        await indexPatternService.updateSavedObject(indexPattern);

        const message = i18n.translate('indexPatternFieldEditor.deleteField.savedHeader', {
          defaultMessage: "Saved '{fieldName}'",
          values: { fieldName: updatedField.name },
        });
        notifications.toasts.addSuccess(message);
        setIsSaving(false);

        const editedField = indexPattern.getFieldByName(updatedField.name);
        onSave(editedField!);
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
      field?.name,
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
          field={fieldToEdit}
          runtimeFieldValidator={validateRuntimeField}
          isSavingField={isSaving}
        />
      </FieldPreviewProvider>
    </FieldEditorProvider>
  );
};
