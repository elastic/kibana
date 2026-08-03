import React from 'react';
import type { DocLinksStart, NotificationsStart, CoreStart } from '@kbn/core/public';
import type { DataView, DataViewField, DataViewLazy, DataPublicPluginStart, UsageCollectionStart, DataViewsPublicPluginStart, FieldFormatsStart } from '../shared_imports';
import type { Field, PluginStart, InternalFieldType } from '../types';
import type { ApiService } from '../lib';
import type { Props as FieldEditorFlyoutContentProps } from './field_editor_flyout_content';
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
export declare const FieldEditorFlyoutContentContainer: ({ fieldToEdit, fieldToCreate, onSave, onCancel, onMounted, docLinks, fieldTypeToProcess, dataView, dataViewToUpdate, dataViews, search, notifications, usageCollection, apiService, fieldFormatEditors, fieldFormats, uiSettings, }: Props) => React.JSX.Element;
