/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EuiButtonProps, EuiPageSidebarProps } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiPageSidebar,
  euiBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { DataViewField, type FieldSpec } from '@kbn/data-views-plugin/common';
import { getDataViewFieldSubtypeMulti } from '@kbn/es-query/src/utils';
import { FIELDS_LIMIT_SETTING } from '@kbn/discover-utils';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FieldList } from '../../components/field_list';
import { FieldListFilters } from '../../components/field_list_filters';
import { FieldListGrouped, type FieldListGroupedProps } from '../../components/field_list_grouped';
import { FieldsGroupNames } from '../../types';
import type { ButtonAddFieldVariant, AdditionalFieldGroups } from '../../types';
import type { GroupedFieldsParams } from '../../hooks/use_grouped_fields';
import { useGroupedFields } from '../../hooks/use_grouped_fields';
import { runAfterNextPaint } from '../../utils/run_after_next_paint';
import {
  UnifiedFieldListItem,
  type UnifiedFieldListItemProps,
  type UnifiedFieldListItemReorderGroup,
} from '../unified_field_list_item';
import { SidebarToggleButton, type SidebarToggleButtonProps } from './sidebar_toggle_button';
import {
  getSelectedFields,
  reorderSelectedFields,
  shouldShowField,
  type SelectedFieldsResult,
} from './group_fields';

const REORDERABLE_FIELD_GROUP_NAMES = [FieldsGroupNames.SelectedFields];

interface OptimisticSelectedFieldNames {
  /**
   * The workspace state the optimistic order was derived from
   */
  workspaceSelectedFieldNames: string[] | undefined;
  /**
   * The selected field names in their new order
   */
  fieldNames: string[];
}

export type UnifiedFieldListSidebarCustomizableProps = Pick<
  UnifiedFieldListItemProps,
  | 'services'
  | 'workspaceSelectedFieldNames'
  | 'dataView'
  | 'trackUiMetric'
  | 'onAddFilter'
  | 'onAddBreakdownField'
  | 'onAddFieldToWorkspace'
  | 'onRemoveFieldFromWorkspace'
  | 'additionalFilters'
  | 'streamNames'
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
  additionalFieldGroups?: AdditionalFieldGroups;
  /**
   * Remove multiple selected fields from the workspace in a single update
   */
  onRemoveFieldsFromWorkspace?: (fields: DataViewField[]) => void;
  /**
   * Move a selected field to another position in the workspace (e.g. table columns).
   * When provided, the "Selected fields" section becomes reorderable via drag and drop.
   * `targetIndex` refers to the position within `workspaceSelectedFieldNames` and is meant
   * to be applied as "remove the field, then insert it at `targetIndex`".
   */
  onMoveFieldInWorkspace?: (field: DataViewField, targetIndex: number) => void;
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
  onAddBreakdownField,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  onRemoveFieldsFromWorkspace,
  onAddFilter,
  onSelectedFieldFilter,
  onEditField,
  onDeleteField,
  onToggleSidebar,
  additionalFilters,
  additionalFieldGroups,
  streamNames,
  onMoveFieldInWorkspace,
}) => {
  const styles = useMemoCss(componentStyles);

  const { dataViews, core } = services;

  const [multiFieldsMap, setMultiFieldsMap] = useState<
    Map<string, Array<{ field: DataViewField; isSelected: boolean }>> | undefined
  >(undefined);
  const [isFieldNameSearchFocused, setIsFieldNameSearchFocused] = useState(false);

  // Reordering the selected fields via drag and drop applies the new order to this state right away,
  // so it's visible in the same frame as the drop, while the workspace (which can be expensive to
  // re-render) is updated after the next paint. The optimistic order is discarded as soon as the
  // workspace state changes, which normally means that it caught up with the new order.
  const [optimisticSelectedFieldNames, setOptimisticSelectedFieldNames] =
    useState<OptimisticSelectedFieldNames | null>(null);
  const pendingWorkspaceUpdatesRef = useRef(new Set<() => void>());

  const currentWorkspaceSelectedFieldNames =
    optimisticSelectedFieldNames &&
    isEqual(optimisticSelectedFieldNames.workspaceSelectedFieldNames, workspaceSelectedFieldNames)
      ? optimisticSelectedFieldNames.fieldNames
      : workspaceSelectedFieldNames;

  useEffect(() => {
    setOptimisticSelectedFieldNames((prevState) =>
      prevState && !isEqual(prevState.workspaceSelectedFieldNames, workspaceSelectedFieldNames)
        ? null
        : prevState
    );
  }, [workspaceSelectedFieldNames]);

  useEffect(() => {
    const pendingWorkspaceUpdates = pendingWorkspaceUpdatesRef.current;
    return () => {
      pendingWorkspaceUpdates.forEach((cancel) => cancel());
      pendingWorkspaceUpdates.clear();
    };
  }, []);

  const selectedFieldsState = useMemo(
    () =>
      getSelectedFields({
        dataView,
        workspaceSelectedFieldNames: onSelectedFieldFilter
          ? []
          : currentWorkspaceSelectedFieldNames,
        allFields,
        searchMode,
      }),
    [dataView, currentWorkspaceSelectedFieldNames, allFields, searchMode, onSelectedFieldFilter]
  );

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

  const selectedFieldsGroup = fieldListGroupedProps.fieldGroups[FieldsGroupNames.SelectedFields];
  const isSelectedFieldsReorderingEnabled = Boolean(
    onMoveFieldInWorkspace &&
      !onSelectedFieldFilter &&
      !alwaysShowActionButton &&
      !stateService.creationOptions.disableFieldListItemDragAndDrop
  );
  // Reordering is only possible while all selected fields are visible, i.e. the list is not narrowed
  // down by a field name search or a type filter. Otherwise, the visible position of a field
  // would not match its position in the workspace.
  const canReorderSelectedFields =
    isSelectedFieldsReorderingEnabled &&
    !!selectedFieldsGroup &&
    selectedFieldsGroup.fields.length > 1 &&
    selectedFieldsGroup.fields.length === selectedFieldsGroup.fieldCount;

  const onReorderSelectedField = useCallback(
    (sourceFieldName: string, targetFieldName: string) => {
      const { selectedFields } = selectedFieldsState;
      const sourceField = selectedFields.find((field) => field.name === sourceFieldName);
      const result = reorderSelectedFields({
        selectedFieldNames: selectedFields.map((field) => field.name),
        sourceFieldName,
        targetFieldName,
      });

      if (!onMoveFieldInWorkspace || !sourceField || !result) {
        return;
      }

      // show the new order right away...
      setOptimisticSelectedFieldNames({
        workspaceSelectedFieldNames,
        fieldNames: result.reorderedFieldNames,
      });

      // ...and update the workspace once the sidebar has been painted
      const pendingWorkspaceUpdates = pendingWorkspaceUpdatesRef.current;
      const cancel = runAfterNextPaint(() => {
        pendingWorkspaceUpdates.delete(cancel);
        onMoveFieldInWorkspace(sourceField, result.targetIndex);
      });
      pendingWorkspaceUpdates.add(cancel);
    },
    [onMoveFieldInWorkspace, selectedFieldsState, workspaceSelectedFieldNames]
  );

  const selectedFieldsReorderGroup: UnifiedFieldListItemReorderGroup | undefined = useMemo(
    () =>
      canReorderSelectedFields && selectedFieldsGroup
        ? {
            items: selectedFieldsGroup.fields.map((field) => ({ id: field.name })),
            label: selectedFieldsGroup.title,
            onReorder: onReorderSelectedField,
          }
        : undefined,
    [canReorderSelectedFields, selectedFieldsGroup, onReorderSelectedField]
  );

  useEffect(() => {
    if (
      searchMode !== 'documents' ||
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
    setMultiFieldsMap,
    searchMode,
  ]);

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    ({ field, groupName, groupIndex, itemIndex, fieldSearchHighlight }) => (
      <li
        key={`field${field.name}`}
        data-attr-field={field.name}
        css={
          groupName === FieldsGroupNames.SelectedFields && selectedFieldsReorderGroup
            ? styles.reorderableFieldItem
            : undefined
        }
      >
        <UnifiedFieldListItem
          additionalFilters={additionalFilters}
          alwaysShowActionButton={alwaysShowActionButton}
          dataView={dataView!}
          field={field}
          groupIndex={groupIndex}
          highlight={fieldSearchHighlight}
          isEmpty={groupName === FieldsGroupNames.EmptyFields}
          isSelected={
            groupName === FieldsGroupNames.SelectedFields ||
            Boolean(selectedFieldsState.selectedFieldsMap[field.name])
          }
          itemIndex={itemIndex}
          multiFields={multiFieldsMap?.get(field.name)} // ideally we better calculate multifields when they are requested first from the popover
          onAddBreakdownField={onAddBreakdownField}
          onAddFieldToWorkspace={onAddFieldToWorkspace}
          onAddFilter={onAddFilter}
          onDeleteField={onDeleteField}
          onEditField={onEditField}
          onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
          searchMode={searchMode}
          services={services}
          size={compressed ? 'xs' : 's'}
          stateService={stateService}
          trackUiMetric={trackUiMetric}
          workspaceSelectedFieldNames={workspaceSelectedFieldNames}
          streamNames={streamNames}
          reorderGroup={
            groupName === FieldsGroupNames.SelectedFields ? selectedFieldsReorderGroup : undefined
          }
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
      onAddBreakdownField,
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
      streamNames,
      selectedFieldsReorderGroup,
      styles.reorderableFieldItem,
    ]
  );

  const onDeselectSelectedFields = useCallback(() => {
    if (!onRemoveFieldsFromWorkspace) {
      return;
    }

    const removableSelectedFields = selectedFieldsState.selectedFields.filter(
      (field) => field.name !== '_source'
    );

    if (removableSelectedFields.length === 0) {
      return;
    }

    onRemoveFieldsFromWorkspace(removableSelectedFields);
  }, [onRemoveFieldsFromWorkspace, selectedFieldsState.selectedFields]);

  const canDeselectSelectedFields =
    Boolean(onRemoveFieldsFromWorkspace) &&
    selectedFieldsState.selectedFields.some((field) => field.name !== '_source');

  if (!dataView) {
    return null;
  }

  const pageSidebarProps: Partial<EuiPageSidebarProps> = {
    className: 'unifiedFieldListSidebar',
    'aria-label': i18n.translate('unifiedFieldList.fieldListSidebar.fieldsSidebarAriaLabel', {
      defaultMessage: 'Fields',
    }),
    id:
      stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
      'unifiedFieldListSidebarId',
    'data-test-subj':
      stateService.creationOptions.dataTestSubj?.fieldListSidebarDataTestSubj ??
      'unifiedFieldListSidebarId',
    css: [
      styles.sidebar,
      isSidebarCollapsed && styles.sidebarCollapsed,
      fullWidth ? styles.sidebarListFullWidth : styles.sidebarFixedWidth,
    ],
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

  if (isSidebarCollapsed) {
    if (sidebarToggleButton) {
      return (
        <EuiHideFor sizes={['xs', 's']}>
          <div {...pageSidebarProps}>{sidebarToggleButton}</div>
        </EuiHideFor>
      );
    }
    return null;
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
        css={styles.sidebarGroup}
        direction="column"
        alignItems="stretch"
        gutterSize="none"
        responsive={false}
      >
        {Boolean(prepend) && (
          <EuiFlexItem grow={false} css={styles.sidebarPrependedItem}>
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
                  <FieldListFilters
                    {...fieldListFiltersProps}
                    compressed={compressed}
                    onFieldNameSearchBlur={() => setIsFieldNameSearchFocused(false)}
                    onFieldNameSearchFocus={() => setIsFieldNameSearchFocused(true)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            css={styles.sidebarList}
          >
            {showFieldList ? (
              <FieldListGrouped
                {...fieldListGroupedProps}
                renderFieldItem={renderFieldItem}
                localStorageKeyPrefix={stateService.creationOptions.localStorageKeyPrefix}
                muteScreenReader={!isFieldNameSearchFocused}
                onDeselectSelectedFields={
                  canDeselectSelectedFields ? onDeselectSelectedFields : undefined
                }
                reorderableGroupNames={
                  isSelectedFieldsReorderingEnabled ? REORDERABLE_FIELD_GROUP_NAMES : undefined
                }
              />
            ) : (
              <EuiFlexItem grow />
            )}
          </FieldList>
        </EuiFlexItem>
        {!!onEditField && (
          <EuiFlexItem
            grow={false}
            css={hasButtonAddFieldToolbarStyle ? styles.sidebarEditField : undefined}
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

const componentStyles = {
  sidebar: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;

    return css({
      overflow: 'hidden',
      margin: '0 !important',
      flexGrow: 1,
      padding: 0,
      height: '100%',

      '.unifiedFieldListItemButton.kbnFieldButton': {
        marginBottom: `calc(${euiTheme.size.xs} / 2)`,
        background: 'none',
        boxShadow: 'none',
      },

      '.unifiedFieldListItemButton__dragging': {
        background: euiTheme.colors.emptyShade,
      },

      [euiBreakpoint(themeContext, ['xs', 's'])]: {
        width: '100%',
        padding: euiTheme.size.base,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
      },
    });
  },
  sidebarCollapsed: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: 'auto',
      padding: `${euiTheme.size.s} ${euiTheme.size.s} 0`,
    }),
  sidebarFixedWidth: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.base * 19,
    }),
  sidebarListFullWidth: css({
    minWidth: `0 !important`,
  }),
  sidebarList: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;

    return css({
      padding: `${euiTheme.size.s} ${euiTheme.size.xs} 0 ${euiTheme.size.xs}`,

      '> *, .euiAccordion__triggerWrapper, .euiAccordion__children, .unifiedFieldListItemButton': {
        paddingLeft: euiTheme.size.xs,
        paddingRight: euiTheme.size.xs,
      },

      '.unifiedFieldListSidebar__accordionContainer': {
        paddingLeft: 0,
        paddingRight: 0,
      },

      [euiBreakpoint(themeContext, ['xs', 's'])]: {
        padding: `${euiTheme.size.s} 0 0 0`,

        '> *, .euiAccordion__triggerWrapper, .unifiedFieldListSidebar__accordionContainer, .unifiedFieldListItemButton':
          {
            paddingLeft: 0,
            paddingRight: 0,
          },
      },
    });
  },
  sidebarGroup: css({
    height: '100%',
  }),
  // to contain the absolutely positioned drop layer of a reorderable item
  reorderableFieldItem: css({
    position: 'relative',
  }),
  sidebarPrependedItem: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginBottom: euiTheme.size.s,
    }),
  sidebarEditField: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
      borderTop: euiTheme.border.thin,
    }),
};
