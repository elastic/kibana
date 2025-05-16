/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import { DocLinksStart, NotificationsStart, CoreStart } from '@kbn/core/public';

import { BehaviorSubject } from 'rxjs';
import {
  DataView,
  DataViewField,
  DataViewLazy,
  DataPublicPluginStart,
  UsageCollectionStart,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
} from '../shared_imports';
import type { Field, PluginStart, InternalFieldType } from '../types';
import { getLinks, ApiService } from '../lib';
import {
  FieldEditorFlyoutContent,
  Props as FieldEditorFlyoutContentProps,
} from './field_editor_flyout_content';
import { FieldEditorProvider } from './field_editor_context';
import { FieldPreviewProvider } from './preview';
import { PreviewController } from './preview/preview_controller';

export interface Props {
  /** Handler for the "save" footer button */
  onSave: (field: DataViewField[]) => void;
  /** Handler for the "cancel" footer button */
  onCancel: () => void;
  onMounted?: FieldEditorFlyoutContentProps['onMounted'];
  /** The docLinks start service from core */
  docLinks: DocLinksStart;
  /** The index pattern where the field will be added  */
  dataView: DataViewLazy;
  dataViewToUpdate: DataView | DataViewLazy;
  /** The Kibana field type of the field to create or edit (default: "runtime") */
  fieldTypeToProcess: InternalFieldType;
  /** Optional field to edit */
  fieldToEdit?: Field;
  /** Optional initial configuration for new field */
  fieldToCreate?: Field;
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
  fieldToEdit,
  fieldToCreate,
  onSave,
  onCancel,
  onMounted,
  docLinks,
  fieldTypeToProcess,
  dataView,
  dataViewToUpdate,
  dataViews,
  search,
  notifications,
  usageCollection,
  apiService,
  fieldFormatEditors,
  fieldFormats,
  uiSettings,
}: Props) => {
  const [controller] = useState(
    () =>
      new PreviewController({
        deps: {
          dataViews,
          search,
          fieldFormats,
          usageCollection,
          notifications,
        },
        dataView,
        dataViewToUpdate,
        onSave,
        fieldToEdit,
        fieldTypeToProcess,
      })
  );

  const services = useMemo(
    () => ({
      api: apiService,
      search,
      notifications,
    }),
    [apiService, search, notifications]
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
      fieldName$={new BehaviorSubject(fieldToEdit?.name || '')}
      subfields$={new BehaviorSubject(fieldToEdit?.fields)}
    >
      <FieldPreviewProvider controller={controller}>
        <FieldEditorFlyoutContent
          onSave={controller.saveField}
          onCancel={onCancel}
          onMounted={onMounted}
          fieldToCreate={fieldToCreate}
          fieldToEdit={fieldToEdit}
        />
      </FieldPreviewProvider>
    </FieldEditorProvider>
  );
};
