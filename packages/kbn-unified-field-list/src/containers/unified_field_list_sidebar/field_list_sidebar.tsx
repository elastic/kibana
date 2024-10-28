/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './field_list_sidebar.scss';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import classnames from 'classnames';
import {
  EuiButton,
  EuiButtonProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiPageSidebar,
  EuiPageSidebarProps,
  useEuiTheme,
} from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { DataViewField, type FieldSpec } from '@kbn/data-views-plugin/common';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query/src/utils';
import { FIELDS_LIMIT_SETTING, SEARCH_FIELDS_FROM_SOURCE } from '@kbn/discover-utils';
import { FieldList } from '../../components/field_list';
import { FieldListFilters } from '../../components/field_list_filters';
import { FieldListGrouped, type FieldListGroupedProps } from '../../components/field_list_grouped';
import { FieldsGroupNames } from '../../types';
import type { ButtonAddFieldVariant, AdditionalFieldGroups } from '../../types';
import { GroupedFieldsParams, useGroupedFields } from '../../hooks/use_grouped_fields';
import { UnifiedFieldListItem, type UnifiedFieldListItemProps } from '../unified_field_list_item';
import { SidebarToggleButton, type SidebarToggleButtonProps } from './sidebar_toggle_button';
import {
  getSelectedFields,
  shouldShowField,
  type SelectedFieldsResult,
  INITIAL_SELECTED_FIELDS_RESULT,
} from './group_fields';

export type UnifiedFieldListSidebarCustomizableProps = Pick<
  UnifiedFieldListItemProps,
  | 'services'
  | 'workspaceSelectedFieldNames'
  | 'dataView'
  | 'trackUiMetric'
  | 'onAddFilter'
  | 'onAddFieldToWorkspace'
  | 'onRemoveFieldFromWorkspace'
  | 'additionalFilters'
> & {
  /**
   * All fields: fields from data view and unmapped fields or columns from text-based search
   */
  allFields: DataViewField[] | null;

  /**
   * Whether to render the field list or not (we don't show it unless documents are loaded)
   */
  showFieldList?: boolean;

  /**
   * Make the field list full width
   */
  fullWidth?: boolean;

  /**
   * Compressed view
   */
  compressed?: boolean;

  /**
   * Custom logic for determining which field is selected
   */
  onSelectedFieldFilter?: GroupedFieldsParams<DataViewField>['onSelectedFieldFilter'];

  /**
   * Prop to pass additional field groups to the field list
   */
  additionalFieldGroups?: AdditionalFieldGroups<DataViewField>;
};

interface UnifiedFieldListSidebarInternalProps {
  /**
   * Current search mode based on current query
   */
  searchMode: UnifiedFieldListItemProps['searchMode'];

  /**
   * Service for managing the state
   */
  stateService: UnifiedFieldListItemProps['stateService'];

  /**
   * Show loading instead of the field list if processing
   */
  isProcessing: boolean;

  /**
   * Whether filters are applied
   */
  isAffectedByGlobalFilter: boolean;

  /**
   * Custom element to render at the top
   */
  prepend?: React.ReactNode;

  /**
   * Whether to make action buttons visible
   */
  alwaysShowActionButton?: UnifiedFieldListItemProps['alwaysShowActionButton'];

  /**
   * What button style type to use
   */
  buttonAddFieldVariant: ButtonAddFieldVariant;

  /**
   * In case if sidebar is collapsible by default
   * Pass `undefined` to hide the collapse/expand buttons from the sidebar
   */
  isSidebarCollapsed?: boolean;

  /**
   * A handler to toggle the sidebar
   */
  onToggleSidebar?: SidebarToggleButtonProps['onChange'];

  /**
   * Trigger a field editing
   */
  onEditField: UnifiedFieldListItemProps['onEditField'] | undefined;

  /**
   * Trigger a field deletion
   */
  onDeleteField: UnifiedFieldListItemProps['onDeleteField'] | undefined;
}

export type UnifiedFieldListSidebarProps = UnifiedFieldListSidebarCustomizableProps &
  UnifiedFieldListSidebarInternalProps;

export const UnifiedFieldListSidebarComponent: React.FC<UnifiedFieldListSidebarProps> = ({
  stateService,
  searchMode,
  services,
  workspaceSelectedFieldNames,
  isProcessing,
  alwaysShowActionButton,
  buttonAddFieldVariant,
  isSidebarCollapsed,
  allFields,
  dataView,
  trackUiMetric,
  showFieldList = true,
  compressed = true,
  fullWidth,
  isAffectedByGlobalFilter,
  prepend,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  onAddFilter,
  onSelectedFieldFilter,
  onEditField,
  onDeleteField,
  onToggleSidebar,
  additionalFieldGroups,
  additionalFilters,
}) => {
  const { dataViews, core } = services;
  const useNewFieldsApi = useMemo(
    () => !core.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE),
    [core.uiSettings]
  );

  const [selectedFieldsState, setSelectedFieldsState] = useState<SelectedFieldsResult>(
    INITIAL_SELECTED_FIELDS_RESULT
  );
  const [multiFieldsMap, setMultiFieldsMap] = useState<
    Map<string, Array<{ field: DataViewField; isSelected: boolean }>> | undefined
  >(undefined);

  useEffect(() => {
    const result = getSelectedFields({
      dataView,
      workspaceSelectedFieldNames: onSelectedFieldFilter ? [] : workspaceSelectedFieldNames,
      allFields,
      searchMode,
    });
    setSelectedFieldsState(result);
  }, [
    dataView,
    workspaceSelectedFieldNames,
    setSelectedFieldsState,
    allFields,
    searchMode,
    onSelectedFieldFilter,
  ]);

  const popularFieldsLimit = useMemo(
    () => core.uiSettings.get(FIELDS_LIMIT_SETTING),
    [core.uiSettings]
  );
  const onSupportedFieldFilter: GroupedFieldsParams<DataViewField>['onSupportedFieldFilter'] =
    useCallback(
      (field: DataViewField) => {
        return shouldShowField(
          field,
          searchMode,
          stateService.creationOptions.disableMultiFieldsGroupingByParent
        );
      },
      [searchMode, stateService.creationOptions.disableMultiFieldsGroupingByParent]
    );

  const { fieldListFiltersProps, fieldListGroupedProps, allFieldsModified } =
    useGroupedFields<DataViewField>({
      dataViewId: (searchMode === 'documents' && dataView?.id) || null, // passing `null` for text-based queries
      allFields,
      popularFieldsLimit:
        searchMode !== 'documents' || stateService.creationOptions.disablePopularFields
          ? 0
          : popularFieldsLimit,
      isAffectedByGlobalFilter,
      services: {
        dataViews,
        core,
      },
      sortedSelectedFields: onSelectedFieldFilter ? undefined : selectedFieldsState.selectedFields,
      onSelectedFieldFilter,
      onSupportedFieldFilter:
        stateService.creationOptions.onSupportedFieldFilter ?? onSupportedFieldFilter,
      onOverrideFieldGroupDetails: stateService.creationOptions.onOverrideFieldGroupDetails,
      getNewFieldsBySpec,
      additionalFieldGroups,
    });

  useEffect(() => {
    if (
      searchMode !== 'documents' ||
      !useNewFieldsApi ||
      stateService.creationOptions.disableMultiFieldsGroupingByParent
    ) {
      setMultiFieldsMap(undefined); // we don't have to calculate multifields in this case
    } else {
      setMultiFieldsMap(
        calculateMultiFields(allFieldsModified, selectedFieldsState.selectedFieldsMap)
      );
    }
  }, [
    stateService.creationOptions.disableMultiFieldsGroupingByParent,
    selectedFieldsState.selectedFieldsMap,
    allFieldsModified,
    useNewFieldsApi,
    setMultiFieldsMap,
    searchMode,
  ]);

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    ({ field, groupName, groupIndex, itemIndex, fieldSearchHighlight }) => (
      <li key={`field${field.name}`} data-attr-field={field.name}>
        <UnifiedFieldListItem
          stateService={stateService}
          searchMode={searchMode}
          services={services}
          alwaysShowActionButton={alwaysShowActionButton}
          field={field}
          size={compressed ? 'xs' : 's'}
          highlight={fieldSearchHighlight}
          dataView={dataView!}
          onAddFieldToWorkspace={onAddFieldToWorkspace}
          onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
          onAddFilter={onAddFilter}
          trackUiMetric={trackUiMetric}
          multiFields={multiFieldsMap?.get(field.name)} // ideally we better calculate multifields when they are requested first from the popover
          onEditField={onEditField}
          onDeleteField={onDeleteField}
          workspaceSelectedFieldNames={workspaceSelectedFieldNames}
          groupIndex={groupIndex}
          itemIndex={itemIndex}
          isEmpty={groupName === FieldsGroupNames.EmptyFields}
          isSelected={
            groupName === FieldsGroupNames.SelectedFields ||
            Boolean(selectedFieldsState.selectedFieldsMap[field.name])
          }
          additionalFilters={additionalFilters}
        />
      </li>
    ),
    [
      stateService,
      searchMode,
      services,
      alwaysShowActionButton,
      compressed,
      dataView,
      onAddFieldToWorkspace,
      onRemoveFieldFromWorkspace,
      onAddFilter,
      trackUiMetric,
      multiFieldsMap,
      onEditField,
      onDeleteField,
      workspaceSelectedFieldNames,
      selectedFieldsState.selectedFieldsMap,
      additionalFilters,
    ]
  );

  const { euiTheme } = useEuiTheme();

  if (!dataView) {
    return null;
  }

  const pageSidebarProps: Partial<EuiPageSidebarProps> = {
    className: classnames('unifiedFieldListSidebar', {
      'unifiedFieldListSidebar--collapsed': isSidebarCollapsed,
      ['unifiedFieldListSidebar--fullWidth']: fullWidth,
    }),
    'aria-label': i18n.translate('unifiedFieldList.fieldListSidebar.fieldsSidebarAriaLabel', {
      defaultMessage: 'Fields',
    }),
    id:
      stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
      'unifiedFieldListSidebarId',
    'data-test-subj':
      stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
      'unifiedFieldListSidebarId',
  };

  const sidebarToggleButton =
    typeof isSidebarCollapsed === 'boolean' && onToggleSidebar ? (
      <SidebarToggleButton
        buttonSize={compressed ? 's' : 'm'}
        isSidebarCollapsed={isSidebarCollapsed}
        panelId={pageSidebarProps.id}
        onChange={onToggleSidebar}
      />
    ) : null;

  if (isSidebarCollapsed && sidebarToggleButton) {
    return (
      <EuiHideFor sizes={['xs', 's']}>
        <div {...pageSidebarProps}>{sidebarToggleButton}</div>
      </EuiHideFor>
    );
  }

  const hasButtonAddFieldToolbarStyle = buttonAddFieldVariant === 'toolbar';
  const buttonAddFieldCommonProps: Partial<Omit<EuiButtonProps, 'type'>> = {
    size: 's',
    iconType: 'indexOpen',
    'data-test-subj':
      stateService.creationOptions.dataTestSubj?.fieldListAddFieldButtonTestSubj ??
      'unifiedFieldListAddField',
    className: 'unifiedFieldListSidebar__addBtn',
  };
  const buttonAddFieldLabel = i18n.translate(
    'unifiedFieldList.fieldListSidebar.addFieldButtonLabel',
    {
      defaultMessage: 'Add a field',
    }
  );

  return (
    <EuiPageSidebar {...pageSidebarProps}>
      <EuiFlexGroup
        className="unifiedFieldListSidebar__group"
        direction="column"
        alignItems="stretch"
        gutterSize="none"
        responsive={false}
      >
        {Boolean(prepend) && (
          <EuiFlexItem
            grow={false}
            css={css`
              margin-bottom: ${euiTheme.size.s};
            `}
          >
            {prepend}
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <FieldList
            isProcessing={isProcessing}
            prepend={
              <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                {sidebarToggleButton && (
                  <EuiFlexItem grow={false}>{sidebarToggleButton}</EuiFlexItem>
                )}
                <EuiFlexItem>
                  <FieldListFilters {...fieldListFiltersProps} compressed={compressed} />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            className="unifiedFieldListSidebar__list"
          >
            {showFieldList ? (
              <FieldListGrouped
                {...fieldListGroupedProps}
                renderFieldItem={renderFieldItem}
                localStorageKeyPrefix={stateService.creationOptions.localStorageKeyPrefix}
              />
            ) : (
              <EuiFlexItem grow />
            )}
          </FieldList>
        </EuiFlexItem>
        {!!onEditField && (
          <EuiFlexItem
            grow={false}
            css={
              hasButtonAddFieldToolbarStyle
                ? css`
                    padding: ${euiTheme.size.s};
                    border-top: ${euiTheme.border.thin};
                  `
                : undefined
            }
          >
            {hasButtonAddFieldToolbarStyle ? (
              <ToolbarButton
                {...buttonAddFieldCommonProps}
                label={buttonAddFieldLabel}
                onClick={() => onEditField()}
              />
            ) : (
              <EuiButton {...buttonAddFieldCommonProps} onClick={() => onEditField()}>
                {buttonAddFieldLabel}
              </EuiButton>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPageSidebar>
  );
};

export const UnifiedFieldListSidebar = memo(UnifiedFieldListSidebarComponent);

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default UnifiedFieldListSidebar;

function calculateMultiFields(
  allFields: DataViewField[] | null,
  selectedFieldsMap: SelectedFieldsResult['selectedFieldsMap'] | undefined
) {
  if (!allFields) {
    return undefined;
  }
  const map = new Map<string, Array<{ field: DataViewField; isSelected: boolean }>>();
  allFields.forEach((field) => {
    const subTypeMulti = getDataViewFieldSubtypeMulti(field);
    const parent = subTypeMulti?.multi.parent;
    if (!parent) {
      return;
    }
    const multiField = {
      field,
      isSelected: Boolean(selectedFieldsMap?.[field.name]),
    };
    const value = map.get(parent) ?? [];
    value.push(multiField);
    map.set(parent, value);
  });
  return map;
}

function getNewFieldsBySpec(fieldSpecArr: FieldSpec[]): DataViewField[] {
  return fieldSpecArr.map((fieldSpec) => new DataViewField(fieldSpec));
}
