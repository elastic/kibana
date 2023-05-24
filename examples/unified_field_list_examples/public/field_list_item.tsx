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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { DragDrop } from '@kbn/dom-drag-drop';
import {
  AddFieldFilterHandler,
  FieldItemButton,
  FieldItemButtonProps,
  FieldPopover,
  FieldPopoverHeader,
  FieldsGroupNames,
  FieldStats,
  hasQuerySubscriberData,
  RenderFieldItemParams,
  useQuerySubscriber,
} from '@kbn/unified-field-list-plugin/public';
import { generateFilters } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AppPluginStartDependencies } from './types';

export interface FieldListItemProps extends RenderFieldItemParams<DataViewField> {
  dataView: DataView;
  services: AppPluginStartDependencies & {
    core: CoreStart;
    uiSettings: CoreStart['uiSettings'];
  };
  isSelected: boolean;
  onAddFieldToWorkspace: FieldItemButtonProps<DataViewField>['onAddFieldToWorkspace'];
  onRemoveFieldFromWorkplace: FieldItemButtonProps<DataViewField>['onRemoveFieldFromWorkspace'];
  onRefreshFields: () => void;
}

export function FieldListItem({
  dataView,
  services,
  isSelected,
  field,
  fieldSearchHighlight,
  groupIndex,
  groupName,
  itemIndex,
  hideDetails,
  onRefreshFields,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkplace,
}: FieldListItemProps) {
  const { dataViewFieldEditor, data } = services;
  const querySubscriberResult = useQuerySubscriber({ data });
  const filterManager = data?.query?.filterManager;
  const [infoIsOpen, setOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const closeFieldEditor = useRef<() => void | undefined>();
  const setFieldEditorRef = useCallback((ref: () => void | undefined) => {
    closeFieldEditor.current = ref;
  }, []);

  const value = useMemo(
    () => ({
      id: field.name,
      humanData: { label: field.displayName || field.name },
    }),
    [field]
  );

  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  const addFilterAndClose: AddFieldFilterHandler | undefined = useMemo(
    () =>
      filterManager && dataView
        ? (clickedField, values, operation) => {
            closePopover();
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
    [dataView, filterManager, closePopover]
  );

  const editFieldAndClose = useMemo(
    () =>
      dataView
        ? (fieldName?: string) => {
            const ref = dataViewFieldEditor.openEditor({
              ctx: {
                dataView,
              },
              fieldName,
              onSave: async () => {
                onRefreshFields();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            closePopover();
          }
        : undefined,
    [dataViewFieldEditor, dataView, setFieldEditorRef, closePopover, onRefreshFields]
  );

  const removeFieldAndClose = useMemo(
    () =>
      dataView
        ? async (fieldName: string) => {
            const ref = dataViewFieldEditor.openDeleteModal({
              ctx: {
                dataView,
              },
              fieldName,
              onDelete: async () => {
                onRefreshFields();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            closePopover();
          }
        : undefined,
    [dataView, setFieldEditorRef, closePopover, dataViewFieldEditor, onRefreshFields]
  );

  useEffect(() => {
    const cleanup = () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

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
              isSelected={isSelected}
              onClick={togglePopover}
              onAddFieldToWorkspace={onAddFieldToWorkspace}
              onRemoveFieldFromWorkspace={onRemoveFieldFromWorkplace}
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
                      onAddFilter={addFilterAndClose}
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
