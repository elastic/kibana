/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_sidebar.scss';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSideBar_Deprecated as EuiPageSideBar,
} from '@elastic/eui';
import { isOfAggregateQueryType } from '@kbn/es-query';
import useShallowCompareEffect from 'react-use/lib/useShallowCompareEffect';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { type DataViewField, getFieldSubtypeMulti } from '@kbn/data-views-plugin/public';
import {
  ExistenceFetchStatus,
  FieldListGrouped,
  FieldListGroupedProps,
  FieldsGroupNames,
  GroupedFieldsParams,
  triggerVisualizeActionsTextBasedLanguages,
  useExistingFieldsReader,
  useGroupedFields,
} from '@kbn/unified-field-list-plugin/public';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverField } from './discover_field';
import { DiscoverFieldSearch } from './discover_field_search';
import { FIELDS_LIMIT_SETTING, PLUGIN_ID } from '../../../../../common';
import { getSelectedFields, shouldShowField } from './lib/group_fields';
import { doesFieldMatchFilters, FieldFilterState, setFieldFilterProp } from './lib/field_filter';
import { getDataViewFieldList } from './lib/get_data_view_field_list';
import { DiscoverSidebarResponsiveProps } from './discover_sidebar_responsive';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import type { DataTableRecord } from '../../../../types';
import { getUiActions } from '../../../../kibana_services';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { RecordRawType } from '../../hooks/use_saved_search';

const EMPTY_FIELD_LIST: DataViewField[] = [];

export interface DiscoverSidebarProps extends DiscoverSidebarResponsiveProps {
  /**
   * Current state of the field filter, filtering fields by name, type, ...
   */
  fieldFilter: FieldFilterState;
  /**
   * Change current state of fieldFilter
   */
  setFieldFilter: (next: FieldFilterState) => void;

  /**
   * Callback to close the flyout if sidebar is rendered in a flyout
   */
  closeFlyout?: () => void;

  /**
   * Pass the reference to field editor component to the parent, so it can be properly unmounted
   * @param ref reference to the field editor component
   */
  setFieldEditorRef?: (ref: () => void | undefined) => void;

  /**
   * Handles "Edit field" action
   * Buttons will be hidden if not provided
   * @param fieldName
   */
  editField?: (fieldName?: string) => void;

  /**
   * Handles "Create a data view action" action
   * Buttons will be hidden if not provided
   */
  createNewDataView?: () => void;

  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts?: Record<string, number>;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  documents?: DataTableRecord[];
  /**
   * Discover view mode
   */
  viewMode: VIEW_MODE;

  showDataViewPicker?: boolean;
}

export function DiscoverSidebarComponent({
  alwaysShowActionButtons = false,
  columns,
  fieldCounts,
  fieldFilter,
  documents$,
  documents, // TODO: remove
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedDataView,
  setFieldFilter,
  trackUiMetric,
  useNewFieldsApi = false,
  onFieldEdited,
  onChangeDataView,
  setFieldEditorRef,
  closeFlyout,
  editField,
  viewMode,
  createNewDataView,
  showDataViewPicker,
}: DiscoverSidebarProps) {
  const { uiSettings, dataViewFieldEditor, dataViews } = useDiscoverServices();
  const [fields, setFields] = useState<DataViewField[] | null>(null);
  const isPlainRecord = useAppStateSelector(
    (state) => getRawRecordType(state.query) === RecordRawType.PLAIN
  );
  const query = useAppStateSelector((state) => state.query);
  const isGlobalFilterApplied = useAppStateSelector((state) => Boolean(state.filters?.length));

  useEffect(() => {
    if (documents) {
      const newFields = getDataViewFieldList(selectedDataView, fieldCounts);
      setFields(newFields);
    }
  }, [selectedDataView, fieldCounts, documents]);

  const onChangeFieldSearch = useCallback(
    (filterName: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilter, filterName, value);
      setFieldFilter(newState);
    },
    [fieldFilter, setFieldFilter]
  );

  const selectedFields = useMemo(() => {
    return getSelectedFields(fields, columns);
  }, [fields, columns]);

  const { fieldTypes, presentFieldTypes } = useMemo(() => {
    const result = ['any'];
    const dataViewFieldTypes = new Set<string>();
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (field.type !== '_source') {
          // If it's a string type, we want to distinguish between keyword and text
          // For this purpose we need the ES type
          const type =
            field.type === 'string' &&
            field.esTypes &&
            ['keyword', 'text'].includes(field.esTypes[0])
              ? field.esTypes?.[0]
              : field.type;
          // _id and _index would map to string, that's why we don't add the string type here
          if (type && type !== 'string') {
            dataViewFieldTypes.add(type);
          }
          if (result.indexOf(field.type) === -1) {
            result.push(field.type);
          }
        }
      }
    }
    return { fieldTypes: result, presentFieldTypes: Array.from(dataViewFieldTypes) };
  }, [fields]);

  const showFieldStats = useMemo(() => viewMode === VIEW_MODE.DOCUMENT_LEVEL, [viewMode]);

  const calculateMultiFields = () => {
    if (!useNewFieldsApi || !fields) {
      return undefined;
    }
    const map = new Map<string, Array<{ field: DataViewField; isSelected: boolean }>>();
    fields.forEach((field) => {
      const subTypeMulti = getFieldSubtypeMulti(field);
      const parent = subTypeMulti?.multi.parent;
      if (!parent) {
        return;
      }
      const multiField = {
        field,
        isSelected: selectedFields.includes(field),
      };
      const value = map.get(parent) ?? [];
      value.push(multiField);
      map.set(parent, value);
    });
    return map;
  };

  const [multiFields, setMultiFields] = useState(() => calculateMultiFields());

  useShallowCompareEffect(() => {
    setMultiFields(calculateMultiFields());
  }, [fields, selectedFields, useNewFieldsApi]);

  const deleteField = useMemo(
    () =>
      editField && selectedDataView
        ? async (fieldName: string) => {
            const ref = dataViewFieldEditor.openDeleteModal({
              ctx: {
                dataView: selectedDataView,
              },
              fieldName,
              onDelete: async () => {
                await onFieldEdited();
              },
            });
            if (setFieldEditorRef) {
              setFieldEditorRef(ref);
            }
            if (closeFlyout) {
              closeFlyout();
            }
          }
        : undefined,
    [
      selectedDataView,
      editField,
      setFieldEditorRef,
      closeFlyout,
      onFieldEdited,
      dataViewFieldEditor,
    ]
  );

  const visualizeAggregateQuery = useCallback(() => {
    const aggregateQuery = query && isOfAggregateQueryType(query) ? query : undefined;
    triggerVisualizeActionsTextBasedLanguages(
      getUiActions(),
      columns,
      PLUGIN_ID,
      selectedDataView,
      aggregateQuery
    );
  }, [columns, selectedDataView, query]);

  const popularFieldsLimit = useMemo(() => uiSettings.get(FIELDS_LIMIT_SETTING), [uiSettings]);
  const onFilterField: GroupedFieldsParams<DataViewField>['onFilterField'] = useCallback(
    (field) => {
      return doesFieldMatchFilters(field, fieldFilter);
    },
    [fieldFilter]
  );
  const onSupportedFieldFilter: GroupedFieldsParams<DataViewField>['onSupportedFieldFilter'] =
    useCallback(
      (field) => {
        return shouldShowField(field, useNewFieldsApi);
      },
      [useNewFieldsApi]
    );
  const onOverrideFieldGroupDetails: GroupedFieldsParams<DataViewField>['onOverrideFieldGroupDetails'] =
    useCallback((groupName) => {
      if (groupName === FieldsGroupNames.AvailableFields) {
        return {
          helpText: i18n.translate('discover.fieldChooser.availableFieldsTooltip', {
            defaultMessage:
              'Your query returned values for these fields. Click + to add an available field to the data table.',
          }),
        };
      }
    }, []);
  const fieldsExistenceReader = useExistingFieldsReader();
  const { fieldGroups } = useGroupedFields({
    dataViewId: isPlainRecord || !selectedDataView?.id ? null : selectedDataView.id, // TODO: check whether we need Empty fields for text-based query
    fieldsExistenceReader,
    allFields: fields || EMPTY_FIELD_LIST,
    popularFieldsLimit: isPlainRecord ? 0 : popularFieldsLimit,
    sortedSelectedFields: selectedFields,
    isAffectedByGlobalFilter: isGlobalFilterApplied,
    services: {
      dataViews,
    },
    onFilterField,
    onSupportedFieldFilter,
    onOverrideFieldGroupDetails,
  });

  // TODO: hide meta fields on Discover for text-based queries

  // console.log({
  //   fields,
  //   oldSelectedFields,
  //   popularFields,
  //   unpopularFields,
  //   fieldGroups,
  //   columns,
  // });

  const renderFieldItem: FieldListGroupedProps<DataViewField>['renderFieldItem'] = useCallback(
    ({ field, groupName }) => (
      <li key={`field${field.name}`} data-attr-field={field.name}>
        <DiscoverField
          alwaysShowActionButton={alwaysShowActionButtons}
          field={field}
          highlight={fieldFilter.name}
          dataView={selectedDataView!}
          onAddField={onAddField}
          onRemoveField={onRemoveField}
          onAddFilter={onAddFilter}
          documents$={documents$}
          trackUiMetric={trackUiMetric}
          multiFields={multiFields?.get(field.name)}
          onEditField={editField}
          onDeleteField={deleteField}
          showFieldStats={showFieldStats}
          contextualFields={columns}
          selected={groupName === FieldsGroupNames.SelectedFields || selectedFields.includes(field)}
        />
      </li>
    ),
    [
      alwaysShowActionButtons,
      selectedDataView,
      onAddField,
      onRemoveField,
      onAddFilter,
      documents$,
      trackUiMetric,
      multiFields,
      editField,
      deleteField,
      showFieldStats,
      columns,
      selectedFields,
      fieldFilter.name,
    ]
  );

  if (!selectedDataView) {
    return null;
  }

  return (
    <EuiPageSideBar
      className="dscSidebar"
      aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
        defaultMessage: 'Index and fields',
      })}
      id="discover-sidebar"
      data-test-subj="discover-sidebar"
    >
      <EuiFlexGroup
        className="dscSidebar__group"
        direction="column"
        alignItems="stretch"
        gutterSize="s"
        responsive={false}
      >
        {Boolean(showDataViewPicker) && (
          <DataViewPicker
            currentDataViewId={selectedDataView.id}
            onChangeDataView={onChangeDataView}
            onAddField={editField}
            onDataViewCreated={createNewDataView}
            trigger={{
              label: selectedDataView?.getName() || '',
              'data-test-subj': 'dataView-switch-link',
              title: selectedDataView?.getIndexPattern() || '',
              fullWidth: true,
            }}
          />
        )}
        <EuiFlexItem grow={false}>
          <form>
            <DiscoverFieldSearch
              onChange={onChangeFieldSearch}
              value={fieldFilter.name}
              types={fieldTypes}
              presentFieldTypes={presentFieldTypes}
              isPlainRecord={isPlainRecord}
            />
          </form>
        </EuiFlexItem>
        <EuiFlexItem>
          <FieldListGrouped
            fieldGroups={fieldGroups}
            fieldsExistenceStatus={
              fields && selectedDataView?.id
                ? fieldsExistenceReader.getFieldsExistenceStatus(selectedDataView.id)
                : ExistenceFetchStatus.unknown
            }
            renderFieldItem={renderFieldItem}
            fieldsExistInIndex={Boolean(fields?.length)}
          />
        </EuiFlexItem>
        {!!editField && (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="indexOpen"
              data-test-subj="dataView-add-field_btn"
              onClick={() => editField()}
              size="s"
            >
              {i18n.translate('discover.fieldChooser.addField.label', {
                defaultMessage: 'Add a field',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {isPlainRecord && (
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="lensApp"
              data-test-subj="textBased-visualize"
              onClick={visualizeAggregateQuery}
              size="s"
            >
              {i18n.translate('discover.textBasedLanguages.visualize.label', {
                defaultMessage: 'Visualize in Lens',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPageSideBar>
  );
}

export const DiscoverSidebar = memo(DiscoverSidebarComponent);
