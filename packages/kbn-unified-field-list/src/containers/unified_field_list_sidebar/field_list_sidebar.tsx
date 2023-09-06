/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './field_list_sidebar.scss';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSidebar,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { type DataViewField } from '@kbn/data-views-plugin/public';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query/src/utils';
import { FIELDS_LIMIT_SETTING, SEARCH_FIELDS_FROM_SOURCE } from '@kbn/discover-utils';
import { FieldList } from '../../components/field_list';
import { FieldListFilters } from '../../components/field_list_filters';
import { FieldListGrouped, type FieldListGroupedProps } from '../../components/field_list_grouped';
import { FieldsGroupNames } from '../../types';
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
   * Custom logic for determining which field is selected
   */
  onSelectedFieldFilter?: GroupedFieldsParams<DataViewField>['onSelectedFieldFilter'];
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
  isSidebarCollapsed,
  allFields,
  dataView,
  trackUiMetric,
  showFieldList = true,
  isAffectedByGlobalFilter,
  prepend,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  onAddFilter,
  onSelectedFieldFilter,
  onEditField,
  onDeleteField,
  onToggleSidebar,
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

  useEffect(() => {
    if (
      searchMode !== 'documents' ||
      !useNewFieldsApi ||
      stateService.creationOptions.disableMultiFieldsGroupingByParent
    ) {
      setMultiFieldsMap(undefined); // we don't have to calculate multifields in this case
    } else {
      setMultiFieldsMap(calculateMultiFields(allFields, selectedFieldsState.selectedFieldsMap));
    }
  }, [
    stateService.creationOptions.disableMultiFieldsGroupingByParent,
    selectedFieldsState.selectedFieldsMap,
    allFields,
    useNewFieldsApi,
    setMultiFieldsMap,
    searchMode,
  ]);

  const popularFieldsLimit = useMemo(
    () => core.uiSettings.get(FIELDS_LIMIT_SETTING),
    [core.uiSettings]
  );
  const onSupportedFieldFilter: GroupedFieldsParams<DataViewField>['onSupportedFieldFilter'] =
    useCallback(
      (field) => {
        return shouldShowField(
          field,
          searchMode,
          stateService.creationOptions.disableMultiFieldsGroupingByParent
        );
      },
      [searchMode, stateService.creationOptions.disableMultiFieldsGroupingByParent]
    );

  const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields<DataViewField>({
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
  });

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    ({ field, groupName, groupIndex, itemIndex, fieldSearchHighlight }) => (
      <li key={`field${field.name}`} data-attr-field={field.name}>
        <UnifiedFieldListItem
          stateService={stateService}
          searchMode={searchMode}
          services={services}
          alwaysShowActionButton={alwaysShowActionButton}
          field={field}
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
        />
      </li>
    ),
    [
      stateService,
      searchMode,
      services,
      alwaysShowActionButton,
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
    ]
  );

  const { euiTheme } = useEuiTheme();
  const buttonBackgroundColor = useEuiBackgroundColor('plain');

  if (!dataView) {
    return null;
  }

  return (
    <EuiPageSidebar
      className="unifiedFieldListSidebar"
      aria-label={i18n.translate(
        'unifiedFieldList.fieldListSidebar.indexAndFieldsSectionAriaLabel',
        {
          defaultMessage: 'Index and fields',
        }
      )}
      id={
        stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
        'unifiedFieldListSidebarId'
      }
      data-test-subj={
        stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
        'unifiedFieldListSidebarId'
      }
    >
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
                {typeof isSidebarCollapsed === 'boolean' && onToggleSidebar && (
                  <EuiFlexItem grow={false}>
                    <SidebarToggleButton
                      isSidebarCollapsed={isSidebarCollapsed}
                      onChange={onToggleSidebar}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <FieldListFilters {...fieldListFiltersProps} />
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
              alwaysShowActionButton
                ? undefined
                : css`
                    padding: ${euiTheme.size.s};
                    background-color: ${buttonBackgroundColor};
                    border-top: ${euiTheme.border.thin};
                  `
            }
          >
            <ToolbarButton
              iconType="indexOpen"
              label={i18n.translate('unifiedFieldList.fieldListSidebar.addFieldButtonLabel', {
                defaultMessage: 'Add a field',
              })}
              data-test-subj={
                stateService.creationOptions.dataTestSubj?.fieldListAddFieldButtonTestSubj ??
                'unifiedFieldListAddField'
              }
              onClick={() => onEditField()}
              size="s"
            />
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
