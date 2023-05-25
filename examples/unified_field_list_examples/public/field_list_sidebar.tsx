/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ChildDragDropProvider, DragContext } from '@kbn/dom-drag-drop';
import {
  FieldList,
  FieldListFilters,
  FieldListGrouped,
  FieldListGroupedProps,
  FieldsGroupNames,
  useExistingFieldsFetcher,
  useGroupedFields,
  useQuerySubscriber,
} from '@kbn/unified-field-list-plugin/public';
import { FieldListItem, FieldListItemProps } from './field_list_item';

export interface FieldListSidebarProps {
  dataView: DataView;
  selectedFieldNames: string[];
  services: FieldListItemProps['services'];
  onAddFieldToWorkplace: FieldListItemProps['onAddFieldToWorkspace'];
  onRemoveFieldFromWorkspace: FieldListItemProps['onRemoveFieldFromWorkspace'];
}

export const FieldListSidebar: React.FC<FieldListSidebarProps> = ({
  dataView,
  selectedFieldNames,
  services,
  onAddFieldToWorkplace,
  onRemoveFieldFromWorkspace,
}) => {
  const dragDropContext = useContext(DragContext);
  const allFields = dataView.fields;
  const activeDataViews = useMemo(() => [dataView], [dataView]);
  const querySubscriberResult = useQuerySubscriber({
    data: services.data,
    listenToSearchSessionUpdates: false, // this example app does not use search sessions
  });

  const onSelectedFieldFilter = useCallback(
    (field: DataViewField) => {
      return selectedFieldNames.includes(field.name);
    },
    [selectedFieldNames]
  );

  const { refetchFieldsExistenceInfo, isProcessing } = useExistingFieldsFetcher({
    dataViews: activeDataViews, // if you need field existence info for more than one data view, you can specify it here
    query: querySubscriberResult.query,
    filters: querySubscriberResult.filters,
    fromDate: querySubscriberResult.fromDate,
    toDate: querySubscriberResult.toDate,
    services,
  });

  const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields({
    dataViewId: dataView.id ?? null,
    allFields,
    services,
    isAffectedByGlobalFilter: Boolean(querySubscriberResult.filters?.length),
    onSupportedFieldFilter,
    onSelectedFieldFilter,
  });

  const onRefreshFields = useCallback(() => {
    refetchFieldsExistenceInfo();
  }, [refetchFieldsExistenceInfo]);

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    (params) => (
      <FieldListItem
        dataView={dataView}
        services={services}
        isSelected={
          params.groupName === FieldsGroupNames.SelectedFields ||
          selectedFieldNames.includes(params.field.name)
        }
        onRefreshFields={onRefreshFields}
        onAddFieldToWorkspace={onAddFieldToWorkplace}
        onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
        {...params}
      />
    ),
    [
      dataView,
      services,
      onRefreshFields,
      selectedFieldNames,
      onAddFieldToWorkplace,
      onRemoveFieldFromWorkspace,
    ]
  );

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <FieldList
        isProcessing={isProcessing}
        prepend={<FieldListFilters {...fieldListFiltersProps} />}
      >
        <FieldListGrouped
          {...fieldListGroupedProps}
          renderFieldItem={renderFieldItem}
          localStorageKeyPrefix="examples"
        />
      </FieldList>
    </ChildDragDropProvider>
  );
};

function onSupportedFieldFilter(field: DataViewField): boolean {
  return field.name !== '_source';
}
