/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { SearchMode } from '../../types';
import { FieldItemButton, type FieldItemButtonProps } from '../../components/field_item_button';
import {
  FieldPopover,
  FieldPopoverHeader,
  type FieldPopoverHeaderProps,
  FieldPopoverFooter,
  type FieldPopoverFooterProps,
  FieldPopoverProps,
} from '../../components/field_popover';
import {
  UnifiedFieldListItemStats,
  type UnifiedFieldListItemStatsProps,
} from './field_list_item_stats';
import type {
  UnifiedFieldListSidebarContainerCreationOptions,
  AddFieldFilterHandler,
} from '../../types';
import { canProvideStatsForEsqlField } from '../../utils/can_provide_stats';

export interface GetCommonFieldItemButtonPropsParams {
  options: UnifiedFieldListSidebarContainerCreationOptions;
  field: DataViewField;
  size: FieldItemButtonProps<DataViewField>['size'];
  isSelected: boolean;
  toggleDisplay: (field: DataViewField, isSelected?: boolean) => void;
}

export function getCommonFieldItemButtonProps({
  options,
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
    buttonAddFieldToWorkspaceProps: options.buttonAddFieldToWorkspaceProps,
    buttonRemoveFieldFromWorkspaceProps: options.buttonRemoveFieldFromWorkspaceProps,
    onAddFieldToWorkspace: handler,
    onRemoveFieldFromWorkspace: handler,
  };
}

interface MultiFieldsProps {
  options: UnifiedFieldListSidebarContainerCreationOptions;
  multiFields: NonNullable<UnifiedFieldListItemPopoverProps['multiFields']>;
  toggleDisplay: (field: DataViewField) => void;
  alwaysShowActionButton: boolean;
  size: FieldItemButtonProps<DataViewField>['size'];
}

const MultiFields: React.FC<MultiFieldsProps> = memo(
  ({ options, multiFields, toggleDisplay, alwaysShowActionButton, size }) => (
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
            options,
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

export interface UnifiedFieldListItemPopoverBaseProps {
  /**
   * Options form the service for managing the state
   */
  options: UnifiedFieldListSidebarContainerCreationOptions;

  /**
   * Required services
   */
  services: UnifiedFieldListItemStatsProps['services'] & {
    uiActions?: FieldPopoverFooterProps['uiActions'];
    fieldsMetadata?: FieldsMetadataPublicStart;
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
  /**
   * Custom filters to apply for the field list, ex: namespace custom filter
   */
  additionalFilters?: Filter[];
  /**
   * Custom query and filters to override the default subscription to the query service
   */
  queryAndFiltersOverride?: UnifiedFieldListItemStatsProps['queryAndFiltersOverride'];
  /**
   * Popover position
   */
  popoverAnchorPosition?: FieldPopoverProps['anchorPosition'];
}

export interface UnifiedFieldListItemPopoverProps extends UnifiedFieldListItemPopoverBaseProps {
  /**
   * Button to trigger the popover
   */
  ButtonComponent: React.FC<
    UnifiedFieldListItemPopoverBaseProps & {
      isPopoverOpen: boolean;
      onTogglePopover: () => void;
      onClosePopover: () => void;
    }
  >;
}

function UnifiedFieldListItemPopoverComponent({
  ButtonComponent,
  ...otherProps
}: UnifiedFieldListItemPopoverProps) {
  const {
    options,
    services,
    searchMode,
    alwaysShowActionButton = false,
    field,
    dataView,
    onAddFieldToWorkspace,
    onRemoveFieldFromWorkspace,
    onAddFilter,
    isSelected,
    trackUiMetric,
    multiFields,
    onEditField,
    onDeleteField,
    workspaceSelectedFieldNames,
    size,
    additionalFilters,
    queryAndFiltersOverride,
    popoverAnchorPosition,
  } = otherProps;
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
    const dataTestSubjPrefix = options.dataTestSubj?.fieldListItemPopoverHeaderDataTestSubjPrefix;
    return {
      buttonAddFieldToWorkspaceProps: options.buttonAddFieldToWorkspaceProps,
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
  }, [field.name, options]);

  const renderPopover = () => {
    return (
      <>
        <UnifiedFieldListItemStats
          options={options}
          services={services}
          field={field}
          multiFields={multiFields}
          dataView={dataView}
          onAddFilter={addFilterAndClosePopover}
          additionalFilters={additionalFilters}
          queryAndFiltersOverride={queryAndFiltersOverride}
        />

        {searchMode === 'documents' && multiFields && (
          <>
            <EuiSpacer size="m" />
            <MultiFields
              options={options}
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
              size={size}
            />
          </>
        )}
      </>
    );
  };

  const renderFooter = useMemo(() => {
    const uiActions = services.uiActions;

    if (searchMode !== 'documents' || !uiActions) {
      return;
    }

    return () => (
      <FieldPopoverFooter
        field={field}
        dataView={dataView}
        multiFields={rawMultiFields}
        trackUiMetric={trackUiMetric}
        contextualFields={workspaceSelectedFieldNames}
        originatingApp={options.originatingApp}
        uiActions={uiActions}
      />
    );
  }, [
    dataView,
    field,
    rawMultiFields,
    searchMode,
    services.uiActions,
    options.originatingApp,
    trackUiMetric,
    workspaceSelectedFieldNames,
  ]);

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      button={
        <ButtonComponent
          {...otherProps}
          isPopoverOpen={infoIsOpen}
          onTogglePopover={togglePopover}
          onClosePopover={closePopover}
        />
      }
      anchorPosition={popoverAnchorPosition}
      closePopover={closePopover}
      data-test-subj={options.dataTestSubj?.fieldListItemPopoverDataTestSubj}
      renderHeader={() => (
        <FieldPopoverHeader
          services={services}
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
        (searchMode === 'text-based' && canProvideStatsForEsqlField(field)) ||
        searchMode === 'documents'
          ? renderPopover
          : undefined
      }
      renderFooter={renderFooter}
    />
  );
}

export const UnifiedFieldListItemPopover = memo(UnifiedFieldListItemPopoverComponent);

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default UnifiedFieldListItemPopover;
