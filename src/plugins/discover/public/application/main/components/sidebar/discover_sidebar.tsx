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
import { shouldShowField, getSelectedFields } from './lib/group_fields';
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
  const fieldsExistenceReader = useExistingFieldsReader();
  const { fieldGroups } = useGroupedFields({
    dataViewId: isPlainRecord || !selectedDataView?.id ? null : selectedDataView.id, // TODO: check whether we need Empty fields for text-based query
    fieldsExistenceReader,
    allFields: fields || EMPTY_FIELD_LIST,
    popularFieldsLimit: isPlainRecord ? 0 : popularFieldsLimit,
    sortedSelectedFields: selectedFields,
    services: {
      dataViews,
    },
    onFilterField,
    onSupportedFieldFilter,
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
          {Boolean(fields) && (
            <FieldListGrouped
              fieldGroups={fieldGroups}
              fieldsExistenceStatus={fieldsExistenceReader.getFieldsExistenceStatus(
                selectedDataView.id!
              )}
              renderFieldItem={renderFieldItem}
              fieldsExistInIndex={Boolean(fields?.length)}
            />
          )}
          {/* <div */}
          {/*  ref={(el) => {*/}
          {/*    if (documents && el && !el.dataset.dynamicScroll) {*/}
          {/*      el.dataset.dynamicScroll = 'true';*/}
          {/*      setScrollContainer(el);*/}
          {/*    }*/}
          {/*  }}*/}
          {/*  onScroll={throttle(lazyScroll, 100)}*/}
          {/*  className="eui-yScroll"*/}
          {/* > */}
          {/*  {Array.isArray(fields) && fields.length > 0 && (*/}
          {/*    <div>*/}
          {/*      {selectedFields &&*/}
          {/*      selectedFields.length > 0 &&*/}
          {/*      selectedFields[0].displayName !== '_source' ? (*/}
          {/*        <>*/}
          {/*          <EuiAccordion*/}
          {/*            id="dscSelectedFields"*/}
          {/*            initialIsOpen={true}*/}
          {/*            buttonContent={*/}
          {/*              <EuiText size="xs" id="selected_fields">*/}
          {/*                <strong>*/}
          {/*                  <FormattedMessage*/}
          {/*                    id="discover.fieldChooser.filter.selectedFieldsTitle"*/}
          {/*                    defaultMessage="Selected fields"*/}
          {/*                  />*/}
          {/*                </strong>*/}
          {/*              </EuiText>*/}
          {/*            }*/}
          {/*            extraAction={*/}
          {/*              <EuiNotificationBadge color={filterChanged ? 'subdued' : 'accent'} size="m">*/}
          {/*                {selectedFields.length}*/}
          {/*              </EuiNotificationBadge>*/}
          {/*            }*/}
          {/*          >*/}
          {/*            <EuiSpacer size="m" />*/}
          {/*            <ul*/}
          {/*              className="dscFieldList"*/}
          {/*              aria-labelledby="selected_fields"*/}
          {/*              data-test-subj={`fieldList-selected`}*/}
          {/*            >*/}
          {/*              {selectedFields.map((field: DataViewField) => {*/}
          {/*                return (*/}
          {/*                  <li key={`field${field.name}`} data-attr-field={field.name}>*/}
          {/*                    <DiscoverField*/}
          {/*                      alwaysShowActionButton={alwaysShowActionButtons}*/}
          {/*                      field={field}*/}
          {/*                      dataView={selectedDataView}*/}
          {/*                      onAddField={onAddField}*/}
          {/*                      onRemoveField={onRemoveField}*/}
          {/*                      onAddFilter={onAddFilter}*/}
          {/*                      documents$={documents$}*/}
          {/*                      selected={true}*/}
          {/*                      trackUiMetric={trackUiMetric}*/}
          {/*                      multiFields={multiFields?.get(field.name)}*/}
          {/*                      onEditField={editField}*/}
          {/*                      onDeleteField={deleteField}*/}
          {/*                      showFieldStats={showFieldStats}*/}
          {/*                      contextualFields={columns}*/}
          {/*                    />*/}
          {/*                  </li>*/}
          {/*                );*/}
          {/*              })}*/}
          {/*            </ul>*/}
          {/*          </EuiAccordion>*/}
          {/*          <EuiSpacer size="s" />{' '}*/}
          {/*        </>*/}
          {/*      ) : null}*/}
          {/*      <EuiAccordion*/}
          {/*        id="dscAvailableFields"*/}
          {/*        initialIsOpen={true}*/}
          {/*        buttonContent={*/}
          {/*          <EuiText size="xs" id="available_fields">*/}
          {/*            <strong id={DISCOVER_TOUR_STEP_ANCHOR_IDS.addFields}>*/}
          {/*              <FormattedMessage*/}
          {/*                id="discover.fieldChooser.filter.availableFieldsTitle"*/}
          {/*                defaultMessage="Available fields"*/}
          {/*              />*/}
          {/*            </strong>*/}
          {/*          </EuiText>*/}
          {/*        }*/}
          {/*        extraAction={*/}
          {/*          <EuiNotificationBadge size="m" color={filterChanged ? 'subdued' : 'accent'}>*/}
          {/*            {restFields.length}*/}
          {/*          </EuiNotificationBadge>*/}
          {/*        }*/}
          {/*      >*/}
          {/*        <EuiSpacer size="s" />*/}
          {/*        {!isPlainRecord && popularFields.length > 0 && (*/}
          {/*          <>*/}
          {/*            <EuiTitle size="xxxs" className="dscFieldListHeader">*/}
          {/*              <h4 id="available_fields_popular">*/}
          {/*                <FormattedMessage*/}
          {/*                  id="discover.fieldChooser.filter.popularTitle"*/}
          {/*                  defaultMessage="Popular"*/}
          {/*                />*/}
          {/*              </h4>*/}
          {/*            </EuiTitle>*/}
          {/*            <ul*/}
          {/*              className="dscFieldList dscFieldList--popular"*/}
          {/*              aria-labelledby="available_fields available_fields_popular"*/}
          {/*              data-test-subj={`fieldList-popular`}*/}
          {/*            >*/}
          {/*              {popularFields.map((field: DataViewField) => {*/}
          {/*                return (*/}
          {/*                  <li key={`field${field.name}`} data-attr-field={field.name}>*/}
          {/*                    <DiscoverField*/}
          {/*                      alwaysShowActionButton={alwaysShowActionButtons}*/}
          {/*                      field={field}*/}
          {/*                      dataView={selectedDataView}*/}
          {/*                      onAddField={onAddField}*/}
          {/*                      onRemoveField={onRemoveField}*/}
          {/*                      onAddFilter={onAddFilter}*/}
          {/*                      documents$={documents$}*/}
          {/*                      trackUiMetric={trackUiMetric}*/}
          {/*                      multiFields={multiFields?.get(field.name)}*/}
          {/*                      onEditField={editField}*/}
          {/*                      onDeleteField={deleteField}*/}
          {/*                      showFieldStats={showFieldStats}*/}
          {/*                      contextualFields={columns}*/}
          {/*                    />*/}
          {/*                  </li>*/}
          {/*                );*/}
          {/*              })}*/}
          {/*            </ul>*/}
          {/*          </>*/}
          {/*        )}*/}
          {/*        <ul*/}
          {/*          className="dscFieldList dscFieldList--unpopular"*/}
          {/*          aria-labelledby="available_fields"*/}
          {/*          data-test-subj={`fieldList-unpopular`}*/}
          {/*          ref={availableFieldsContainer}*/}
          {/*        >*/}
          {/*          {getPaginated(restFields).map((field: DataViewField) => {*/}
          {/*            return (*/}
          {/*              <li key={`field${field.name}`} data-attr-field={field.name}>*/}
          {/*                <DiscoverField*/}
          {/*                  alwaysShowActionButton={alwaysShowActionButtons}*/}
          {/*                  field={field}*/}
          {/*                  dataView={selectedDataView}*/}
          {/*                  onAddField={onAddField}*/}
          {/*                  onRemoveField={onRemoveField}*/}
          {/*                  onAddFilter={onAddFilter}*/}
          {/*                  documents$={documents$}*/}
          {/*                  trackUiMetric={trackUiMetric}*/}
          {/*                  multiFields={multiFields?.get(field.name)}*/}
          {/*                  onEditField={editField}*/}
          {/*                  onDeleteField={deleteField}*/}
          {/*                  showFieldStats={showFieldStats}*/}
          {/*                  contextualFields={columns}*/}
          {/*                />*/}
          {/*              </li>*/}
          {/*            );*/}
          {/*          })}*/}
          {/*        </ul>*/}
          {/*      </EuiAccordion>*/}
          {/*    </div>*/}
          {/*  )}*/}
          {/* </div >*/}
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
