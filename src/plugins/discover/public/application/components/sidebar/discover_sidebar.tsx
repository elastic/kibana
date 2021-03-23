/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_sidebar.scss';
import { throttle } from 'lodash';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
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
import { FIELDS_LIMIT_SETTING } from '../../../../common';
import { groupFields } from './lib/group_fields';
import { IndexPatternField } from '../../../../../data/public';
import { getDetails } from './lib/get_details';
import { FieldFilterState, getDefaultFieldFilter, setFieldFilterProp } from './lib/field_filter';
import { getIndexPatternFieldList } from './lib/get_index_pattern_field_list';
import { DiscoverSidebarResponsiveProps } from './discover_sidebar_responsive';

/**
 * Default number of available fields displayed and added on scroll
 */
const PAGINATION_SIZE = 20;

export interface DiscoverSidebarProps extends DiscoverSidebarResponsiveProps {
  /**
   * Current state of the field filter, filtering fields by name, type, ...
   */
  fieldFilter: FieldFilterState;
  /**
   * Change current state of fieldFilter
   */
  setFieldFilter: (next: FieldFilterState) => void;
}

export function DiscoverSidebar({
  alwaysShowActionButtons = false,
  columns,
  config,
  fieldCounts,
  fieldFilter,
  hits,
  indexPatternList,
  indexPatterns,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  services,
  setAppState,
  setFieldFilter,
  state,
  trackUiMetric,
  useNewFieldsApi = false,
  useFlyout = false,
  unmappedFieldsConfig,
}: DiscoverSidebarProps) {
  const [fields, setFields] = useState<IndexPatternField[] | null>(null);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);

  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits]);

  const onChangeFieldSearch = useCallback(
    (field: string, value: string | boolean | undefined) => {
      const newState = setFieldFilterProp(fieldFilter, field, value);
      setFieldFilter(newState);
      setPageSize(PAGINATION_SIZE);
    },
    [fieldFilter, setFieldFilter]
  );

  const getDetailsByField = useCallback(
    (ipField: IndexPatternField) => getDetails(ipField, hits, columns, selectedIndexPattern),
    [hits, columns, selectedIndexPattern]
  );

  const popularLimit = useMemo(() => services.uiSettings.get(FIELDS_LIMIT_SETTING), [
    services.uiSettings,
  ]);

  const {
    selected: selectedFields,
    popular: popularFields,
    unpopular: unpopularFields,
  } = useMemo(
    () =>
      groupFields(
        fields,
        columns,
        popularLimit,
        fieldCounts,
        fieldFilter,
        useNewFieldsApi,
        !!unmappedFieldsConfig?.showUnmappedFields
      ),
    [
      fields,
      columns,
      popularLimit,
      fieldCounts,
      fieldFilter,
      useNewFieldsApi,
      unmappedFieldsConfig?.showUnmappedFields,
    ]
  );

  const paginate = useCallback(() => {
    setPageSize(
      Math.max(PAGINATION_SIZE, Math.min(pageSize + PAGINATION_SIZE * 0.5, unpopularFields.length))
    );
  }, [setPageSize, pageSize, unpopularFields]);

  useEffect(() => {
    if (scrollContainer && unpopularFields) {
      const { clientHeight, scrollHeight } = scrollContainer;

      if (clientHeight === scrollHeight && pageSize < unpopularFields.length) {
        // in case of there is so much height available that there's no scrolling at initial rendering
        // pagination starts after the first bulk of rendering
        paginate();
      }
    }
  }, [scrollContainer, paginate, unpopularFields, pageSize]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
      const nearBottom = scrollTop + clientHeight > scrollHeight * 0.9;
      if (nearBottom && unpopularFields) {
        paginate();
      }
    }
  }, [paginate, scrollContainer, unpopularFields]);

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

  const getPaginated = useCallback(
    (list) => {
      return list.slice(0, pageSize);
    },
    [pageSize]
  );

  const filterChanged = useMemo(() => isEqual(fieldFilter, getDefaultFieldFilter()), [fieldFilter]);

  if (!selectedIndexPattern || !fields) {
    return null;
  }

  if (useFlyout) {
    return (
      <section
        aria-label={i18n.translate('discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel', {
          defaultMessage: 'Index and fields',
        })}
      >
        <DiscoverIndexPattern
          config={config}
          selectedIndexPattern={selectedIndexPattern}
          indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
          indexPatterns={indexPatterns}
          state={state}
          setAppState={setAppState}
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
            config={config}
            selectedIndexPattern={selectedIndexPattern}
            indexPatternList={sortBy(indexPatternList, (o) => o.attributes.title)}
            indexPatterns={indexPatterns}
            state={state}
            setAppState={setAppState}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <form>
            <DiscoverFieldSearch
              onChange={onChangeFieldSearch}
              value={fieldFilter.name}
              types={fieldTypes}
              useNewFieldsApi={useNewFieldsApi}
            />
          </form>
        </EuiFlexItem>
        <EuiFlexItem className="eui-yScroll">
          <div
            ref={(el) => {
              if (el && !el.dataset.dynamicScroll) {
                el.dataset.dynamicScroll = 'true';
                setScrollContainer(el);
              }
            }}
            onScroll={throttle(lazyScroll, 100)}
            className="eui-yScroll"
          >
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
                            <li key={`field${field.name}`} data-attr-field={field.name}>
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
                            <li key={`field${field.name}`} data-attr-field={field.name}>
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
                    {getPaginated(unpopularFields).map((field: IndexPatternField) => {
                      return (
                        <li key={`field${field.name}`} data-attr-field={field.name}>
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
