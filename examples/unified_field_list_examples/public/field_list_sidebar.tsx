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

import React, { useCallback, useMemo, useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { generateFilters } from '@kbn/data-plugin/public';
import { ChildDragDropProvider, useDragDropContext } from '@kbn/dom-drag-drop';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerProps,
  type UnifiedFieldListSidebarContainerApi,
  type AddFieldFilterHandler,
} from '@kbn/unified-field-list';
import { type CoreStart } from '@kbn/core-lifecycle-browser';
import { PLUGIN_ID } from '../common';
import { type AppPluginStartDependencies } from './types';

const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: PLUGIN_ID,
    localStorageKeyPrefix: 'examples',
    timeRangeUpdatesType: 'timefilter',
    compressed: true,
    showSidebarToggleButton: true,
    disablePopularFields: true,
  };
};

export interface FieldListSidebarProps {
  dataView: DataView;
  selectedFieldNames: string[];
  services: AppPluginStartDependencies & {
    core: CoreStart;
  };
  onAddFieldToWorkspace: UnifiedFieldListSidebarContainerProps['onAddFieldToWorkspace'];
  onRemoveFieldFromWorkspace: UnifiedFieldListSidebarContainerProps['onRemoveFieldFromWorkspace'];
}

export const FieldListSidebar: React.FC<FieldListSidebarProps> = ({
  dataView,
  selectedFieldNames,
  services,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
}) => {
  const dragDropContext = useDragDropContext();
  const unifiedFieldListContainerRef = useRef<UnifiedFieldListSidebarContainerApi>(null);
  const filterManager = services.data?.query?.filterManager;

  const onAddFilter: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager && dataView
        ? (clickedField, values, operation) => {
            const newFilters = generateFilters(
              filterManager,
              clickedField,
              values,
              operation,
              dataView
            );
            filterManager.addFilters(newFilters);
          }
        : undefined,
    [dataView, filterManager]
  );

  const onFieldEdited = useCallback(async () => {
    unifiedFieldListContainerRef.current?.refetchFieldsExistenceInfo();
  }, [unifiedFieldListContainerRef]);

  return (
    <ChildDragDropProvider value={dragDropContext}>
      <UnifiedFieldListSidebarContainer
        ref={unifiedFieldListContainerRef}
        variant="responsive"
        getCreationOptions={getCreationOptions}
        services={services}
        dataView={dataView}
        allFields={dataView.fields}
        workspaceSelectedFieldNames={selectedFieldNames}
        onAddFieldToWorkspace={onAddFieldToWorkspace}
        onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
        onAddFilter={onAddFilter}
        onFieldEdited={onFieldEdited}
      />
    </ChildDragDropProvider>
  );
};
