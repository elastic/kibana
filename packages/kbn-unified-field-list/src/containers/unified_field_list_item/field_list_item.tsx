/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import { Draggable } from '@kbn/dom-drag-drop';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SearchMode } from '../../types';
import { FieldItemButton, type FieldItemButtonProps } from '../../components/field_item_button';
import {
  FieldPopover,
  FieldPopoverHeader,
  type FieldPopoverHeaderProps,
  FieldPopoverFooter,
  type FieldPopoverFooterProps,
} from '../../components/field_popover';
import {
  UnifiedFieldListItemStats,
  type UnifiedFieldListItemStatsProps,
} from './field_list_item_stats';
import type {
  UnifiedFieldListSidebarContainerStateService,
  AddFieldFilterHandler,
} from '../../types';
import { canProvideStatsForFieldTextBased } from '../../utils/can_provide_stats';

interface GetCommonFieldItemButtonPropsParams {
  stateService: UnifiedFieldListSidebarContainerStateService;
  field: DataViewField;
  size: FieldItemButtonProps<DataViewField>['size'];
  isSelected: boolean;
  toggleDisplay: (field: DataViewField, isSelected?: boolean) => void;
}

function getCommonFieldItemButtonProps({
  stateService,
  field,
  size,
  isSelected,
  toggleDisplay,
}: GetCommonFieldItemButtonPropsParams): {
  field: FieldItemButtonProps<DataViewField>['field'];
  size: FieldItemButtonProps<DataViewField>['size'];
  isSelected: FieldItemButtonProps<DataViewField>['isSelected'];
  buttonAddFieldToWorkspaceProps?: FieldItemButtonProps<DataViewField>['buttonAddFieldToWorkspaceProps'];
  buttonRemoveFieldFromWorkspaceProps?: FieldItemButtonProps<DataViewField>['buttonRemoveFieldFromWorkspaceProps'];
  onAddFieldToWorkspace: FieldItemButtonProps<DataViewField>['onAddFieldToWorkspace'];
  onRemoveFieldFromWorkspace: FieldItemButtonProps<DataViewField>['onRemoveFieldFromWorkspace'];
} {
  const handler =
    field.name === '_source' ? undefined : (f: DataViewField) => toggleDisplay(f, isSelected);
  return {
    field,
    size,
    isSelected,
    buttonAddFieldToWorkspaceProps: stateService.creationOptions.buttonAddFieldToWorkspaceProps,
    buttonRemoveFieldFromWorkspaceProps:
      stateService.creationOptions.buttonRemoveFieldFromWorkspaceProps,
    onAddFieldToWorkspace: handler,
    onRemoveFieldFromWorkspace: handler,
  };
}

interface MultiFieldsProps {
  stateService: UnifiedFieldListSidebarContainerStateService;
  multiFields: NonNullable<UnifiedFieldListItemProps['multiFields']>;
  toggleDisplay: (field: DataViewField) => void;
  alwaysShowActionButton: boolean;
  size: FieldItemButtonProps<DataViewField>['size'];
}

const MultiFields: React.FC<MultiFieldsProps> = memo(
  ({ stateService, multiFields, toggleDisplay, alwaysShowActionButton, size }) => (
    <React.Fragment>
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate('unifiedFieldList.fieldListItem.multiFields', {
            defaultMessage: 'Multi fields',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {multiFields.map((entry) => (
        <FieldItemButton
          key={entry.field.name}
          flush="both"
          isEmpty={false}
          isActive={false}
          shouldAlwaysShowAction={alwaysShowActionButton}
          onClick={undefined}
          {...getCommonFieldItemButtonProps({
            stateService,
            field: entry.field,
            isSelected: entry.isSelected,
            toggleDisplay,
            size,
          })}
        />
      ))}
    </React.Fragment>
  )
);

export interface UnifiedFieldListItemProps {
  /**
   * Service for managing the state
   */
  stateService: UnifiedFieldListSidebarContainerStateService;

  /**
   * Required services
   */
  services: UnifiedFieldListItemStatsProps['services'] & {
    uiActions?: FieldPopoverFooterProps['uiActions'];
  };
  /**
   * Current search mode
   */
  searchMode: SearchMode | undefined;
  /**
   * Determines whether add/remove button is displayed not only when focused
   */
  alwaysShowActionButton?: boolean;
  /**
   * The displayed field
   */
  field: DataViewField;
  /**
   * The currently selected data view
   */
  dataView: DataView;
  /**
   * Callback to add/select the field
   */
  onAddFieldToWorkspace: (field: DataViewField) => void;
  /**
   * Callback to remove a field column from the table
   * @param fieldName
   */
  onRemoveFieldFromWorkspace: (field: DataViewField) => void;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: AddFieldFilterHandler;
  /**
   * Determines whether the field is empty
   */
  isEmpty: boolean;
  /**
   * Determines whether the field is selected
   */
  isSelected: boolean;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * Multi fields for the current field
   */
  multiFields?: Array<{ field: DataViewField; isSelected: boolean }>;
  /**
   * Callback to edit a field from data view
   * @param fieldName name of the field to edit
   */
  onEditField?: (fieldName?: string) => void;
  /**
   * Callback to delete a runtime field from data view
   * @param fieldName name of the field to delete
   */
  onDeleteField?: (fieldName: string) => void;
  /**
   * Currently selected fields like table columns
   */
  workspaceSelectedFieldNames?: string[];
  /**
   * Search by field name
   */
  highlight?: string;
  /**
   * Group index in the field list
   */
  groupIndex: number;
  /**
   * Item index in the field list
   */
  itemIndex: number;
  /**
   * Item size
   */
  size: FieldItemButtonProps<DataViewField>['size'];
}

function UnifiedFieldListItemComponent({
  stateService,
  services,
  searchMode,
  alwaysShowActionButton = false,
  field,
  highlight,
  dataView,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  onAddFilter,
  isEmpty,
  isSelected,
  trackUiMetric,
  multiFields,
  onEditField,
  onDeleteField,
  workspaceSelectedFieldNames,
  groupIndex,
  itemIndex,
  size,
}: UnifiedFieldListItemProps) {
  const [infoIsOpen, setOpen] = useState(false);

  const addFilterAndClosePopover: typeof onAddFilter | undefined = useMemo(
    () =>
      onAddFilter
        ? (...params) => {
            setOpen(false);
            onAddFilter?.(...params);
          }
        : undefined,
    [setOpen, onAddFilter]
  );

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const toggleDisplay: GetCommonFieldItemButtonPropsParams['toggleDisplay'] = useCallback(
    (f, isCurrentlySelected) => {
      closePopover();
      if (isCurrentlySelected) {
        onRemoveFieldFromWorkspace(f);
      } else {
        onAddFieldToWorkspace(f);
      }
    },
    [onAddFieldToWorkspace, onRemoveFieldFromWorkspace, closePopover]
  );

  const rawMultiFields = useMemo(() => multiFields?.map((f) => f.field), [multiFields]);

  const customPopoverHeaderProps: Partial<FieldPopoverHeaderProps> = useMemo(() => {
    const dataTestSubjPrefix =
      stateService.creationOptions.dataTestSubj?.fieldListItemPopoverHeaderDataTestSubjPrefix;
    return {
      buttonAddFieldToWorkspaceProps: stateService.creationOptions.buttonAddFieldToWorkspaceProps,
      ...(dataTestSubjPrefix && {
        buttonAddFilterProps: {
          'data-test-subj': `${dataTestSubjPrefix}AddExistFilter-${field.name}`,
        },
        buttonEditFieldProps: {
          'data-test-subj': `${dataTestSubjPrefix}Edit-${field.name}`,
        },
        buttonDeleteFieldProps: {
          'data-test-subj': `${dataTestSubjPrefix}Delete-${field.name}`,
        },
      }),
    };
  }, [field.name, stateService.creationOptions]);

  const renderPopover = () => {
    return (
      <>
        <UnifiedFieldListItemStats
          stateService={stateService}
          services={services}
          field={field}
          multiFields={multiFields}
          dataView={dataView}
          onAddFilter={addFilterAndClosePopover}
        />

        {searchMode === 'documents' && multiFields && (
          <>
            <EuiSpacer size="m" />
            <MultiFields
              stateService={stateService}
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
              size={size}
            />
          </>
        )}

        {searchMode === 'documents' && !!services.uiActions && (
          <FieldPopoverFooter
            field={field}
            dataView={dataView}
            multiFields={rawMultiFields}
            trackUiMetric={trackUiMetric}
            contextualFields={workspaceSelectedFieldNames}
            originatingApp={stateService.creationOptions.originatingApp}
            uiActions={services.uiActions}
          />
        )}
      </>
    );
  };

  const value = useMemo(
    () => ({
      id: field.name,
      humanData: {
        label: field.displayName,
        position: itemIndex + 1,
      },
    }),
    [field, itemIndex]
  );
  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);
  const isDragDisabled =
    alwaysShowActionButton || stateService.creationOptions.disableFieldListItemDragAndDrop;

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      button={
        <Draggable
          dragType="copy"
          dragClassName="unifiedFieldListItemButton__dragging"
          order={order}
          value={value}
          onDragStart={closePopover}
          isDisabled={isDragDisabled}
          dataTestSubj={`${
            stateService.creationOptions.dataTestSubj?.fieldListItemDndDataTestSubjPrefix ??
            'unifiedFieldListItemDnD'
          }-${field.name}`}
        >
          <FieldItemButton
            fieldSearchHighlight={highlight}
            isEmpty={isEmpty}
            isActive={infoIsOpen}
            withDragIcon={!isDragDisabled}
            flush={alwaysShowActionButton ? 'both' : undefined}
            shouldAlwaysShowAction={alwaysShowActionButton}
            onClick={field.type !== '_source' ? togglePopover : undefined}
            {...getCommonFieldItemButtonProps({
              stateService,
              field,
              isSelected,
              toggleDisplay,
              size,
            })}
          />
        </Draggable>
      }
      closePopover={closePopover}
      data-test-subj={stateService.creationOptions.dataTestSubj?.fieldListItemPopoverDataTestSubj}
      renderHeader={() => (
        <FieldPopoverHeader
          field={field}
          closePopover={closePopover}
          onAddFieldToWorkspace={!isSelected ? toggleDisplay : undefined}
          onAddFilter={onAddFilter}
          onEditField={onEditField}
          onDeleteField={onDeleteField}
          {...customPopoverHeaderProps}
        />
      )}
      renderContent={
        (searchMode === 'text-based' && canProvideStatsForFieldTextBased(field)) ||
        searchMode === 'documents'
          ? renderPopover
          : undefined
      }
    />
  );
}

export const UnifiedFieldListItem = memo(UnifiedFieldListItemComponent);
