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
  useExistingFieldsFetcher,
  useGroupedFields,
  useQuerySubscriber,
} from '@kbn/unified-field-list-plugin/public';
import { FieldListItem, FieldListItemProps } from './field_list_item';

export interface FieldListSidebarProps {
  dataView: DataView;
  services: FieldListItemProps['services'];
}

export const FieldListSidebar: React.FC<FieldListSidebarProps> = ({ dataView, services }) => {
  const dragDropContext = useContext(DragContext);
  const allFields = dataView.fields;
  const activeDataViews = useMemo(() => [dataView], [dataView]);
  const querySubscriberResult = useQuerySubscriber({ data: services.data });

  const { isProcessing } = useExistingFieldsFetcher({
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
    // onSelectedFieldFilter,
  });

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    (params) => <FieldListItem dataView={dataView} services={services} {...params} />,
    [dataView, services]
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
