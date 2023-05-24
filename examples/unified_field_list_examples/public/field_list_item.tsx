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

import React, { useCallback, useMemo, useState } from 'react';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { DragDrop } from '@kbn/dom-drag-drop';
import {
  FieldItemButton,
  FieldPopover,
  FieldPopoverHeader,
  FieldsGroupNames,
  FieldStats,
  hasQuerySubscriberData,
  RenderFieldItemParams,
  useQuerySubscriber,
} from '@kbn/unified-field-list-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AppPluginStartDependencies } from './types';

export interface FieldListItemProps extends RenderFieldItemParams<DataViewField> {
  dataView: DataView;
  services: AppPluginStartDependencies & {
    core: CoreStart;
    uiSettings: CoreStart['uiSettings'];
  };
}

export function FieldListItem({
  dataView,
  services,
  field,
  fieldSearchHighlight,
  groupIndex,
  groupName,
  itemIndex,
  hideDetails,
}: FieldListItemProps) {
  const querySubscriberResult = useQuerySubscriber({ data: services.data });
  const [infoIsOpen, setOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const value = useMemo(
    () => ({
      id: field.name,
      humanData: { label: field.displayName || field.name },
    }),
    [field]
  );

  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const onAddFieldToWorkspace = useCallback(() => {
    // TODO
  }, []);

  const addFilterAndClose = useCallback(() => {
    closePopover();
    // TODO
  }, [closePopover]);

  const editFieldAndClose = useCallback(() => {
    closePopover();
    // TODO
  }, [closePopover]);

  const removeFieldAndClose = useCallback(() => {
    closePopover();
    // TODO
  }, [closePopover]);

  const onAddFilter = useCallback(() => {
    closePopover();
    // TODO
  }, [closePopover]);

  return (
    <li>
      <FieldPopover
        isOpen={infoIsOpen}
        closePopover={closePopover}
        button={
          <DragDrop
            draggable
            order={order}
            value={value}
            dataTestSubj={`fieldListPanelField-${field.name}`}
            onDragStart={closePopover}
          >
            <FieldItemButton
              field={field}
              fieldSearchHighlight={fieldSearchHighlight}
              size="xs"
              isActive={infoIsOpen}
              isEmpty={groupName === FieldsGroupNames.EmptyFields}
              isSelected={groupName === FieldsGroupNames.SelectedFields}
              onClick={togglePopover}
            />
          </DragDrop>
        }
        renderHeader={() => {
          return (
            <FieldPopoverHeader
              field={field}
              closePopover={closePopover}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
              onAddFilter={addFilterAndClose}
              onEditField={editFieldAndClose}
              onDeleteField={removeFieldAndClose}
            />
          );
        }}
        renderContent={
          !hideDetails
            ? () => (
                <>
                  {hasQuerySubscriberData(querySubscriberResult) && (
                    <FieldStats
                      services={services}
                      query={querySubscriberResult.query}
                      filters={querySubscriberResult.filters}
                      fromDate={querySubscriberResult.fromDate}
                      toDate={querySubscriberResult.toDate}
                      dataViewOrDataViewId={dataView}
                      onAddFilter={onAddFilter}
                      field={field}
                    />
                  )}
                </>
              )
            : undefined
        }
      />
    </li>
  );
}
