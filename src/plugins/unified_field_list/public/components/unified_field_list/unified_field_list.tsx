/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { type IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  useExistingFieldsFetcher,
  type ExistingFieldsFetcherParams,
} from '../../hooks/use_existing_fields';
import { useGroupedFields, type GroupedFieldsParams } from '../../hooks/use_grouped_fields';
import { type FieldListItem, RenderFieldItemParams } from '../../types';
import { FieldList } from '../field_list';
import { FieldListGrouped, type FieldListGroupedProps } from '../field_list_grouped';
import { FieldListFilters } from '../field_list_filters';
import { FieldItemButton } from '../field_item_button';
import {
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverVisualize,
  type FieldPopoverHeaderProps,
  type FieldPopoverVisualizeProps,
} from '../field_popover';
import { FieldStats } from '../field_stats';

interface UnifiedFieldListServicesBase {
  dataViews: DataViewsContract;
  data: DataPublicPluginStart;
  core: Pick<CoreStart, 'docLinks' | 'uiSettings'>;
}

export interface UnifiedFieldListPropsBase<T extends FieldListItem> {
  // TODO: is it okay to ask for fields via props?
  allFields: T[] | null; // `null` is for indicating loading state

  'data-test-subj'?: string;
  className?: string;
  originatingApp: FieldPopoverVisualizeProps['originatingApp'];
  localStorageKeyPrefix?: FieldListGroupedProps<T>['localStorageKeyPrefix'];

  onRenderFieldItem?: (
    params: RenderFieldItemParams<T> & {
      editField: ((fieldName: string) => Promise<void>) | undefined;
      removeField: ((fieldName: string) => Promise<void>) | undefined;
    }
  ) => JSX.Element;

  getCustomFieldType?: GroupedFieldsParams<T>['getCustomFieldType'];
  onSupportedFieldFilter?: GroupedFieldsParams<T>['onSupportedFieldFilter'];
  onSelectedFieldFilter?: GroupedFieldsParams<T>['onSelectedFieldFilter'];
  onOverrideFieldGroupDetails?: GroupedFieldsParams<T>['onOverrideFieldGroupDetails'];

  onAddFieldToWorkspace?: FieldPopoverHeaderProps['onAddFieldToWorkspace'];
  onAddFilter?: FieldPopoverHeaderProps['onAddFilter'];
}

export interface UnifiedFieldListForDataViewProps<T extends FieldListItem> {
  searchMode?: 'default';

  services: UnifiedFieldListServicesBase & {
    dataViewFieldEditor: IndexPatternFieldEditorStart;
  };

  dataView: DataView;
  allActiveDataViews?: DataView[]; // leave it simply `undefined` unless you have multiple active data views at once for all of which fields existence should be always fetched

  // TODO: should we also encapsulate getting the query/filters/range?
  query: ExistingFieldsFetcherParams['query'];
  filters: ExistingFieldsFetcherParams['filters'];
  fromDate: ExistingFieldsFetcherParams['fromDate'];
  toDate: ExistingFieldsFetcherParams['toDate'];

  onFieldEdited?: (fieldName: string, dataView: DataView) => unknown;
  onFieldRemoved?: (fieldName: string, dataView: DataView) => unknown;

  onNoData?: ExistingFieldsFetcherParams['onNoData'];
}

export interface UnifiedFieldListForTextBasedProps<T extends FieldListItem> {
  searchMode: 'textBased';

  services: UnifiedFieldListServicesBase & {
    dataViewFieldEditor?: IndexPatternFieldEditorStart;
  };

  dataView?: never;
  allActiveDataViews?: never;
  query?: never;
  filters?: never;
  fromDate?: never;
  toDate?: never;
  onFieldEdited?: never;
  onFieldRemoved?: never;
  onNoData?: never;
}

export type UnifiedFieldListConditionalProps<T extends FieldListItem> =
  | UnifiedFieldListForDataViewProps<T>
  | UnifiedFieldListForTextBasedProps<T>;

export type UnifiedFieldListProps<T extends FieldListItem> = UnifiedFieldListConditionalProps<T> &
  UnifiedFieldListPropsBase<T>;

export function UnifiedFieldList<T extends FieldListItem = DataViewField>({
  services,
  query,
  filters,
  fromDate,
  toDate,
  allFields,
  dataView,
  allActiveDataViews,
  'data-test-subj': dataTestSubj,
  className,
  originatingApp,
  localStorageKeyPrefix,
  onRenderFieldItem,
  onFieldEdited,
  onFieldRemoved,
  onNoData,
  getCustomFieldType,
  onSupportedFieldFilter,
  onSelectedFieldFilter,
  onOverrideFieldGroupDetails,
  onAddFieldToWorkspace,
  onAddFilter,
}: UnifiedFieldListProps<T>) {
  const { dataViewFieldEditor, dataViews } = services;
  const currentDataViewId = dataView?.id ?? null;
  const hasEditPermission =
    dataView && dataViewFieldEditor
      ? dataViewFieldEditor.userPermissions.editIndexPattern() || !dataView.isPersisted()
      : false;
  const closeFieldEditor = useRef<() => void | undefined>();
  const activeDataViews = useMemo(
    () => allActiveDataViews || (dataView ? [dataView] : []),
    [dataView, allActiveDataViews]
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, [setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  useEffect(() => {
    return () => {
      // Make sure to close the editor when unmounting
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
  }, []);

  const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
    dataViews: activeDataViews,
    query,
    filters,
    fromDate,
    toDate,
    services,
    onNoData,
  });

  const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields<T>({
    dataViewId: currentDataViewId,
    allFields,
    services,
    isAffectedByGlobalFilter: Boolean(filters?.length),
    getCustomFieldType,
    onSupportedFieldFilter,
    onSelectedFieldFilter,
    onOverrideFieldGroupDetails,
  });

  const editField = useMemo(
    () =>
      currentDataViewId && hasEditPermission
        ? async (fieldName: string) => {
            const dataViewInstance = await dataViews.get(currentDataViewId);
            closeFieldEditor.current = dataViewFieldEditor?.openEditor({
              ctx: {
                dataView: dataViewInstance,
              },
              fieldName,
              onSave: () => {
                if (dataViewInstance.isPersisted()) {
                  refetchFieldsExistenceInfo(dataViewInstance.id);
                }
                if (onFieldEdited) {
                  onFieldEdited(fieldName, dataViewInstance);
                }
              },
            });
          }
        : undefined,
    [
      hasEditPermission,
      dataViews,
      currentDataViewId,
      dataViewFieldEditor,
      refetchFieldsExistenceInfo,
      onFieldEdited,
    ]
  );

  const removeField = useMemo(
    () =>
      currentDataViewId && hasEditPermission
        ? async (fieldName: string) => {
            const dataViewInstance = await dataViews.get(currentDataViewId);
            closeFieldEditor.current = dataViewFieldEditor?.openDeleteModal({
              ctx: {
                dataView: dataViewInstance,
              },
              fieldName,
              onDelete: () => {
                if (dataViewInstance.isPersisted()) {
                  refetchFieldsExistenceInfo(dataViewInstance.id);
                }
                if (onFieldRemoved) {
                  onFieldRemoved(fieldName, dataViewInstance);
                }
              },
            });
          }
        : undefined,
    [
      currentDataViewId,
      dataViews,
      hasEditPermission,
      dataViewFieldEditor,
      refetchFieldsExistenceInfo,
      onFieldRemoved,
    ]
  );

  const renderFieldItem: FieldListGroupedProps<T>['renderFieldItem'] = useMemo(
    () =>
      onRenderFieldItem
        ? (params) =>
            onRenderFieldItem({
              ...params,
              editField,
              removeField,
            })
        : // TODO: check that the default item rendering is working
          ({ field, fieldSearchHighlight }) => {
            // TODO: do we need another component which would wrap FieldItemButton with FieldPopover?
            return (
              <li>
                <FieldPopover
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  button={
                    <FieldItemButton
                      field={field}
                      fieldSearchHighlight={fieldSearchHighlight}
                      onClick={togglePopover}
                    />
                  }
                  renderHeader={() => (
                    <FieldPopoverHeader
                      field={field} // TODO: fix types or change logic to work with T instead of DataViewField strictly
                      closePopover={closePopover}
                      onAddFieldToWorkspace={onAddFieldToWorkspace}
                      onAddFilter={onAddFilter}
                      onEditField={editField}
                      onDeleteField={removeField}
                    />
                  )}
                  renderContent={() => (
                    <>
                      <FieldStats
                        field={field} // TODO: fix types or change logic to work with T instead of DataViewField strictly
                        dataViewOrDataViewId={dataView}
                        onAddFilter={onAddFilter}
                      />
                      <FieldPopoverVisualize
                        field={field} // TODO: fix types or change logic to work with T instead of DataViewField strictly
                        dataView={dataView}
                        originatingApp={originatingApp}
                      />
                    </>
                  )}
                />
              </li>
            );
          },
    [
      onRenderFieldItem,
      isPopoverOpen,
      togglePopover,
      closePopover,
      editField,
      removeField,
      dataView,
      originatingApp,
      onAddFieldToWorkspace,
      onAddFilter,
    ]
  );

  return (
    <FieldList
      className={className}
      isProcessing={isProcessing}
      prepend={<FieldListFilters {...fieldListFiltersProps} data-test-subj={dataTestSubj} />}
    >
      <FieldListGrouped<T>
        {...fieldListGroupedProps}
        renderFieldItem={renderFieldItem}
        data-test-subj={dataTestSubj}
        localStorageKeyPrefix={localStorageKeyPrefix}
      />
    </FieldList>
  );
}
