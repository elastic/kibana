/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { isEqual, sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { UiStatsMetricType } from '@kbn/analytics';
import './discover_sidebar.scss';
import {
  EuiAccordion,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiNotificationBadge,
} from '@elastic/eui';
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

export interface DiscoverSidebarProps {
  /**
   * the selected columns displayed in the doc table in discover
   */
  columns: string[];
  /**
   * a statistics of the distribution of fields in the given hits
   */
  fieldCounts: Record<string, number>;
  /**
   * hits fetched from ES, displayed in the doc table
   */
  hits: Array<Record<string, unknown>>;
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
   * Callback function to select another index pattern
   */
  setIndexPattern: (id: string) => void;
  /**
   * Shows Add button at all times and not only on focus
   */
  mobile?: boolean;
  /**
   * Shows index pattern and a button that displays the sidebar in a flyout
   */
  useFlyout?: boolean;
  /**
   * Current state of the field filter, filtering fields by name, type, ...
   */
  fieldFilter: FieldFilterState;
  /**
   * Change current state of fieldFilter
   */
  setFieldFilter: (next: FieldFilterState) => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiStatsMetricType, eventName: string | string[]) => void;
}

export function DiscoverSidebar({
  columns,
  fieldCounts,
  hits,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  services,
  setIndexPattern,
  trackUiMetric,
  mobile = false,
  useFlyout = false,
  fieldFilter,
  setFieldFilter,
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
  } = useMemo(() => groupFields(fields, columns, popularLimit, fieldCounts, fieldFilter), [
    fields,
    columns,
    popularLimit,
    fieldCounts,
    fieldFilter,
  ]);

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

  if (!selectedIndexPattern || !fields) {
    return null;
  }

  const filterChanged = isEqual(fieldFilter, getDefaultFieldFilter());

  if (useFlyout) {
    return (
      <section
        className="sidebar-list dscSidebar__section "
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <div className="dscSidebar__sectionStatic">
          <DiscoverIndexPattern
            selectedIndexPattern={selectedIndexPattern}
            setIndexPattern={setIndexPattern}
            indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
          />
        </div>
      </section>
    );
  }

  return (
    <I18nProvider>
      <section
        className="sidebar-list dscSidebar__contentWrapper"
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
        id="discover-sidebar"
        data-test-subj="discover-sidebar"
      >
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          className="dscSidebar__content"
          direction="column"
        >
          <EuiFlexItem grow={false}>
            {' '}
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
          <EuiFlexItem>
            <div className="sidebar-list dscSidebar__scrollSection">
              <div className="dscSidebar__scrollSectionList">
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
                            <EuiNotificationBadge
                              color={filterChanged ? 'subdued' : 'accent'}
                              size="m"
                            >
                              {selectedFields.length}
                            </EuiNotificationBadge>
                          }
                        >
                          <EuiSpacer size="s" />
                          <ul
                            className="dscFieldList dscFieldList--selected"
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
                                    field={field}
                                    indexPattern={selectedIndexPattern}
                                    onAddField={onAddField}
                                    onRemoveField={onRemoveField}
                                    onAddFilter={onAddFilter}
                                    getDetails={getDetailsByField}
                                    selected={true}
                                    mobile={mobile}
                                    trackUiMetric={trackUiMetric}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </EuiAccordion>
                        <EuiSpacer size="xs" />{' '}
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
                            <h4 style={{ fontWeight: 'normal' }} id="available_fields_popular">
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
                                    field={field}
                                    indexPattern={selectedIndexPattern}
                                    onAddField={onAddField}
                                    onRemoveField={onRemoveField}
                                    onAddFilter={onAddFilter}
                                    getDetails={getDetailsByField}
                                    mobile={mobile}
                                    trackUiMetric={trackUiMetric}
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
                                field={field}
                                indexPattern={selectedIndexPattern}
                                onAddField={onAddField}
                                onRemoveField={onRemoveField}
                                onAddFilter={onAddFilter}
                                getDetails={getDetailsByField}
                                mobile={mobile}
                                trackUiMetric={trackUiMetric}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </EuiAccordion>
                    <EuiSpacer size="s" />
                  </>
                )}
              </div>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>
    </I18nProvider>
  );
}
