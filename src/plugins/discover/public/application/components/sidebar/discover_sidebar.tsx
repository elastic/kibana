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
import './discover_sidebar.scss';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiTitle, EuiSpacer } from '@elastic/eui';
import { sortBy } from 'lodash';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { IndexPatternAttributes } from '../../../../../data/common';
import { SavedObject } from '../../../../../../core/types';
import { FIELDS_LIMIT_SETTING } from '../../../../common';
import { groupFields } from './lib/group_fields';
import {
  IIndexPatternFieldList,
  IndexPatternField,
  IndexPattern,
  UI_SETTINGS,
} from '../../../../../data/public';
import { AppState } from '../../angular/discover_state';
import { getDetails } from './lib/get_details';
import { getDefaultFieldFilter, setFieldFilterProp } from './lib/field_filter';
import { getIndexPatternFieldList } from './lib/get_index_pattern_field_list';
import { getServices } from '../../../kibana_services';

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
  selectedIndexPattern: IndexPattern;
  /**
   * Callback function to select another index pattern
   */
  setIndexPattern: (id: string) => void;
  /**
   * Current app state, used for generating a link to visualize
   */
  state: AppState;
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
  setIndexPattern,
  state,
}: DiscoverSidebarProps) {
  const [openFieldMap, setOpenFieldMap] = useState(new Map());
  const [showFields, setShowFields] = useState(false);
  const [fields, setFields] = useState<IIndexPatternFieldList | null>(null);
  const [fieldFilterState, setFieldFilterState] = useState(getDefaultFieldFilter());
  const services = useMemo(() => getServices(), []);

  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts, services);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits, services]);

  const onShowDetails = useCallback(
    (show: boolean, field: IndexPatternField) => {
      if (!show) {
        setOpenFieldMap(new Map(openFieldMap.set(field.name, false)));
      } else {
        setOpenFieldMap(new Map(openFieldMap.set(field.name, true)));
        if (services.capabilities.discover.save) {
          selectedIndexPattern.popularizeField(field.name, 1);
        }
      }
    },
    [openFieldMap, selectedIndexPattern, services.capabilities.discover.save]
  );
  const onChangeFieldSearch = useCallback(
    (field: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilterState, field, value);
      setFieldFilterState(newState);
    },
    [fieldFilterState]
  );

  const getDetailsByField = useCallback(
    (ipField: IndexPatternField) =>
      getDetails(ipField, selectedIndexPattern, state, columns, hits, services),
    [selectedIndexPattern, state, columns, hits, services]
  );

  const popularLimit = services.uiSettings.get(FIELDS_LIMIT_SETTING);
  const useShortDots = services.uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE);

  const {
    selected: selectedFields,
    popular: popularFields,
    unpopular: unpopularFields,
  } = useMemo(() => groupFields(fields, columns, popularLimit, fieldCounts, fieldFilterState), [
    fields,
    columns,
    popularLimit,
    fieldCounts,
    fieldFilterState,
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

  return (
    <I18nProvider>
      <section
        className="sidebar-list"
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <DiscoverIndexPattern
          selectedIndexPattern={selectedIndexPattern}
          setIndexPattern={setIndexPattern}
          indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
        />
        <div className="dscSidebar__item">
          <form>
            <DiscoverFieldSearch
              onChange={onChangeFieldSearch}
              value={fieldFilterState.name}
              types={fieldTypes}
            />
          </form>
        </div>
        <div className="sidebar-list">
          {fields.length > 0 && (
            <>
              <EuiTitle size="xxxs" id="selected_fields">
                <h3>
                  <FormattedMessage
                    id="discover.fieldChooser.filter.selectedFieldsTitle"
                    defaultMessage="Selected fields"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <ul
                className="dscSidebarList dscFieldList--selected"
                aria-labelledby="selected_fields"
                data-test-subj={`fieldList-selected`}
              >
                {selectedFields.map((field: IndexPatternField, idx: number) => {
                  return (
                    <li
                      key={`field${idx}`}
                      data-attr-field={field.name}
                      className="dscSidebar__item"
                    >
                      <DiscoverField
                        field={field}
                        indexPattern={selectedIndexPattern}
                        onAddField={onAddField}
                        onRemoveField={onRemoveField}
                        onAddFilter={onAddFilter}
                        onShowDetails={onShowDetails}
                        getDetails={getDetailsByField}
                        showDetails={openFieldMap.get(field.name) || false}
                        selected={true}
                        useShortDots={useShortDots}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="euiFlexGroup euiFlexGroup--gutterMedium">
                <EuiTitle size="xxxs" id="available_fields" className="euiFlexItem">
                  <h3>
                    <FormattedMessage
                      id="discover.fieldChooser.filter.availableFieldsTitle"
                      defaultMessage="Available fields"
                    />
                  </h3>
                </EuiTitle>
                <div className="euiFlexItem euiFlexItem--flexGrowZero">
                  <EuiButtonIcon
                    className={'visible-xs visible-sm dscFieldChooser__toggle'}
                    iconType={showFields ? 'arrowDown' : 'arrowRight'}
                    onClick={() => setShowFields(!showFields)}
                    aria-label={
                      showFields
                        ? i18n.translate(
                            'discover.fieldChooser.filter.indexAndFieldsSectionHideAriaLabel',
                            {
                              defaultMessage: 'Hide fields',
                            }
                          )
                        : i18n.translate(
                            'discover.fieldChooser.filter.indexAndFieldsSectionShowAriaLabel',
                            {
                              defaultMessage: 'Show fields',
                            }
                          )
                    }
                  />
                </div>
              </div>
            </>
          )}
          {popularFields.length > 0 && (
            <div>
              <EuiTitle
                size="xxxs"
                className={`dscFieldListHeader ${!showFields ? 'hidden-sm hidden-xs' : ''}`}
              >
                <h4 style={{ fontWeight: 'normal' }} id="available_fields_popular">
                  <FormattedMessage
                    id="discover.fieldChooser.filter.popularTitle"
                    defaultMessage="Popular"
                  />
                </h4>
              </EuiTitle>
              <ul
                className={`dscFieldList dscFieldList--popular ${
                  !showFields ? 'hidden-sm hidden-xs' : ''
                }`}
                aria-labelledby="available_fields available_fields_popular"
                data-test-subj={`fieldList-popular`}
              >
                {popularFields.map((field: IndexPatternField, idx: number) => {
                  return (
                    <li
                      key={`field${idx}`}
                      data-attr-field={field.name}
                      className="dscSidebar__item"
                    >
                      <DiscoverField
                        field={field}
                        indexPattern={selectedIndexPattern}
                        onAddField={onAddField}
                        onRemoveField={onRemoveField}
                        onAddFilter={onAddFilter}
                        onShowDetails={onShowDetails}
                        getDetails={getDetailsByField}
                        showDetails={openFieldMap.get(field.name) || false}
                        useShortDots={useShortDots}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <ul
            className={`dscFieldList dscFieldList--unpopular ${
              !showFields ? 'hidden-sm hidden-xs' : ''
            }`}
            aria-labelledby="available_fields"
            data-test-subj={`fieldList-unpopular`}
          >
            {unpopularFields.map((field: IndexPatternField, idx: number) => {
              return (
                <li key={`field${idx}`} data-attr-field={field.name} className="dscSidebar__item">
                  <DiscoverField
                    field={field}
                    indexPattern={selectedIndexPattern}
                    onAddField={onAddField}
                    onRemoveField={onRemoveField}
                    onAddFilter={onAddFilter}
                    onShowDetails={onShowDetails}
                    getDetails={getDetailsByField}
                    showDetails={openFieldMap.get(field.name) || false}
                    useShortDots={useShortDots}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </I18nProvider>
  );
}
