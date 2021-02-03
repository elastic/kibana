/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './discover_sidebar.scss';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import {
  EuiAccordion,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiNotificationBadge,
  EuiPageSideBar,
} from '@elastic/eui';
import { isEqual, sortBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { IndexPatternAttributes } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';
import { FIELDS_LIMIT_SETTING } from '../../../../common';
import { groupFields } from './lib/group_fields';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { getDetails } from './lib/get_details';
import { FieldFilterState, getDefaultFieldFilter, setFieldFilterProp } from './lib/field_filter';
import { getIndexPatternFieldList } from './lib/get_index_pattern_field_list';
import { DiscoverServices } from '../../../build_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export interface DiscoverSidebarProps {
  /**
   * Determines whether add/remove buttons are displayed not only when focused
   */
  alwaysShowActionButtons?: boolean;
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts: Record<string, number>;
  /**
   * Current state of the field filter, filtering fields by name, type, ...
   */
  fieldFilter: FieldFilterState;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  hits: ElasticSearchHit[];
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Callback function when selecting a field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback function when adding a filter from sidebar
   */
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  /**
   * Callback function when removing a field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Currently selected index pattern
   */
  selectedIndexPattern?: IndexPattern;
  /**
   * Discover plugin services;
   */
  services: DiscoverServices;
  /**
   * Change current state of fieldFilter
   */
  setFieldFilter: (next: FieldFilterState) => void;
  /**
   * Callback function to select another index pattern
   */
  setIndexPattern: (id: string) => void;
  /**
   * If on, fields are read from the fields API, not from source
   */
  useNewFieldsApi?: boolean;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  /**
   * Shows index pattern and a button that displays the sidebar in a flyout
   */
  useFlyout?: boolean;
}

export function DiscoverSidebar({
  alwaysShowActionButtons = false,
  columns,
  fieldCounts,
  fieldFilter,
  hits,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  services,
  setFieldFilter,
  setIndexPattern,
  trackUiMetric,
  useNewFieldsApi = false,
  useFlyout = false,
}: DiscoverSidebarProps) {
  const [fields, setFields] = useState<IndexPatternField[] | null>(null);

  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits]);

  const onChangeFieldSearch = useCallback(
    (field: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilter, field, value);
      setFieldFilter(newState);
    },
    [fieldFilter, setFieldFilter]
  );

  const getDetailsByField = useCallback(
    (ipField: IndexPatternField) => getDetails(ipField, hits, columns, selectedIndexPattern),
    [hits, columns, selectedIndexPattern]
  );

  const popularLimit = services.uiSettings.get(FIELDS_LIMIT_SETTING);

  const {
    selected: selectedFields,
    popular: popularFields,
    unpopular: unpopularFields,
  } = useMemo(
    () => groupFields(fields, columns, popularLimit, fieldCounts, fieldFilter, useNewFieldsApi),
    [fields, columns, popularLimit, fieldCounts, fieldFilter, useNewFieldsApi]
  );

  const fieldTypes = useMemo(() => {
    const result = ['any'];
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (result.indexOf(field.type) === -1) {
          result.push(field.type);
        }
      }
    }
    return result;
  }, [fields]);

  const multiFields = useMemo(() => {
    if (!useNewFieldsApi || !fields) {
      return undefined;
    }
    const map = new Map<string, Array<{ field: IndexPatternField; isSelected: boolean }>>();
    fields.forEach((field) => {
      const parent = field.spec?.subType?.multi?.parent;
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
  }, [fields, useNewFieldsApi, selectedFields]);

  if (!selectedIndexPattern || !fields) {
    return null;
  }

  const filterChanged = isEqual(fieldFilter, getDefaultFieldFilter());

  if (useFlyout) {
    return (
      <section
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <DiscoverIndexPattern
          selectedIndexPattern={selectedIndexPattern}
          setIndexPattern={setIndexPattern}
          indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
        />
      </section>
    );
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
        <EuiFlexItem grow={false}>
          <DiscoverIndexPattern
            selectedIndexPattern={selectedIndexPattern}
            setIndexPattern={setIndexPattern}
            indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <form>
            <DiscoverFieldSearch
              onChange={onChangeFieldSearch}
              value={fieldFilter.name}
              types={fieldTypes}
            />
          </form>
        </EuiFlexItem>
        <EuiFlexItem className="eui-yScroll">
          <div>
            {fields.length > 0 && (
              <>
                {selectedFields &&
                selectedFields.length > 0 &&
                selectedFields[0].displayName !== '_source' ? (
                  <>
                    <EuiAccordion
                      id="dscSelectedFields"
                      initialIsOpen={true}
                      buttonContent={
                        <EuiText size="xs" id="selected_fields">
                          <strong>
                            <FormattedMessage
                              id="discover.fieldChooser.filter.selectedFieldsTitle"
                              defaultMessage="Selected fields"
                            />
                          </strong>
                        </EuiText>
                      }
                      extraAction={
                        <EuiNotificationBadge color={filterChanged ? 'subdued' : 'accent'} size="m">
                          {selectedFields.length}
                        </EuiNotificationBadge>
                      }
                    >
                      <EuiSpacer size="m" />
                      <ul
                        className="dscFieldList"
                        aria-labelledby="selected_fields"
                        data-test-subj={`fieldList-selected`}
                      >
                        {selectedFields.map((field: IndexPatternField) => {
                          return (
                            <li
                              key={`field${field.name}`}
                              data-attr-field={field.name}
                              className="dscSidebar__item"
                            >
                              <DiscoverField
                                alwaysShowActionButton={alwaysShowActionButtons}
                                field={field}
                                indexPattern={selectedIndexPattern}
                                onAddField={onAddField}
                                onRemoveField={onRemoveField}
                                onAddFilter={onAddFilter}
                                getDetails={getDetailsByField}
                                selected={true}
                                trackUiMetric={trackUiMetric}
                                multiFields={multiFields?.get(field.name)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </EuiAccordion>
                    <EuiSpacer size="s" />{' '}
                  </>
                ) : null}
                <EuiAccordion
                  id="dscAvailableFields"
                  initialIsOpen={true}
                  buttonContent={
                    <EuiText size="xs" id="available_fields">
                      <strong>
                        <FormattedMessage
                          id="discover.fieldChooser.filter.availableFieldsTitle"
                          defaultMessage="Available fields"
                        />
                      </strong>
                    </EuiText>
                  }
                  extraAction={
                    <EuiNotificationBadge size="m" color={filterChanged ? 'subdued' : 'accent'}>
                      {popularFields.length + unpopularFields.length}
                    </EuiNotificationBadge>
                  }
                >
                  <EuiSpacer size="s" />
                  {popularFields.length > 0 && (
                    <>
                      <EuiTitle size="xxxs" className="dscFieldListHeader">
                        <h4 id="available_fields_popular">
                          <FormattedMessage
                            id="discover.fieldChooser.filter.popularTitle"
                            defaultMessage="Popular"
                          />
                        </h4>
                      </EuiTitle>
                      <ul
                        className="dscFieldList dscFieldList--popular"
                        aria-labelledby="available_fields available_fields_popular"
                        data-test-subj={`fieldList-popular`}
                      >
                        {popularFields.map((field: IndexPatternField) => {
                          return (
                            <li
                              key={`field${field.name}`}
                              data-attr-field={field.name}
                              className="dscSidebar__item"
                            >
                              <DiscoverField
                                alwaysShowActionButton={alwaysShowActionButtons}
                                field={field}
                                indexPattern={selectedIndexPattern}
                                onAddField={onAddField}
                                onRemoveField={onRemoveField}
                                onAddFilter={onAddFilter}
                                getDetails={getDetailsByField}
                                trackUiMetric={trackUiMetric}
                                multiFields={multiFields?.get(field.name)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  <ul
                    className="dscFieldList dscFieldList--unpopular"
                    aria-labelledby="available_fields"
                    data-test-subj={`fieldList-unpopular`}
                  >
                    {unpopularFields.map((field: IndexPatternField) => {
                      return (
                        <li
                          key={`field${field.name}`}
                          data-attr-field={field.name}
                          className="dscSidebar__item"
                        >
                          <DiscoverField
                            alwaysShowActionButton={alwaysShowActionButtons}
                            field={field}
                            indexPattern={selectedIndexPattern}
                            onAddField={onAddField}
                            onRemoveField={onRemoveField}
                            onAddFilter={onAddFilter}
                            getDetails={getDetailsByField}
                            trackUiMetric={trackUiMetric}
                            multiFields={multiFields?.get(field.name)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </EuiAccordion>
              </>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageSideBar>
  );
}
