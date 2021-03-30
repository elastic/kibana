/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_sidebar.scss';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiButtonIcon,
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
  onEditRuntimeField,
}: DiscoverSidebarProps) {
  const [fields, setFields] = useState<IndexPatternField[] | null>(null);
  const [isAddIndexPatternFieldPopoverOpen, setIsAddIndexPatternFieldPopoverOpen] = useState(false);
  const { indexPatternFieldEditor, core } = services;
  const indexPatternFieldEditPermission = indexPatternFieldEditor?.userPermissions.editIndexPattern();
  const canEditIndexPatternField = !!indexPatternFieldEditPermission && useNewFieldsApi;
  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits]);

  const closeFieldEditor = useRef<() => void | undefined>();
  useEffect(() => {
    const cleanup = () => {
      if (closeFieldEditor.current) {
        closeFieldEditor.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

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

  const editField = (fieldName: string) => {
    if (!canEditIndexPatternField) {
      return;
    }
    closeFieldEditor.current = indexPatternFieldEditor.openEditor({
      ctx: {
        indexPattern: selectedIndexPattern,
      },
      fieldName,
      onSave: async () => {
        // trigger refresh only if edited field is selected or a Document column
        const editedFieldIsSelected =
          selectedFields.map((field) => field.name).includes(fieldName) ||
          (useNewFieldsApi && selectedFields.length === 0);
        if (editedFieldIsSelected) {
          onEditRuntimeField();
        }
        const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
        setFields(newFields);
      },
    });
  };

  const addField = () => {};

  const filterChanged = isEqual(fieldFilter, getDefaultFieldFilter());

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
          <EuiFlexGroup>
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
              <EuiPopover
                panelPaddingSize="s"
                isOpen={isAddIndexPatternFieldPopoverOpen}
                closePopover={() => {
                  setIsAddIndexPatternFieldPopoverOpen(false);
                }}
                ownFocus
                data-test-subj="discover-addRuntimeField-popover"
                button={
                  <EuiButtonIcon
                    color="text"
                    iconType="boxesHorizontal"
                    data-test-subj="discoverIndexPatternActions"
                    aria-label={i18n.translate(
                      'discover.fieldChooser.indexPatterns.actionsPopoverLabel',
                      {
                        defaultMessage: 'Index pattern settings',
                      }
                    )}
                    onClick={() => {
                      setIsAddIndexPatternFieldPopoverOpen(!isAddIndexPatternFieldPopoverOpen);
                    }}
                  />
                }
              >
                <EuiContextMenuPanel
                  size="s"
                  items={[
                    <EuiContextMenuItem
                      key="add"
                      icon="indexOpen"
                      data-test-subj="indexPattern-add-field"
                      onClick={() => {
                        setIsAddIndexPatternFieldPopoverOpen(false);
                        addField();
                      }}
                    >
                      {i18n.translate('discover.fieldChooser.indexPatterns.addFieldButton', {
                        defaultMessage: 'Add field to index pattern',
                      })}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="manage"
                      icon="indexSettings"
                      onClick={() => {
                        setIsAddIndexPatternFieldPopoverOpen(false);
                        core.application.navigateToApp('management', {
                          path: `/kibana/indexPatterns/patterns/${selectedIndexPattern.id}`,
                        });
                      }}
                    >
                      {i18n.translate('xpack.lens.indexPatterns.manageFieldButton', {
                        defaultMessage: 'Manage index pattern fields',
                      })}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
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
                                onEditField={canEditIndexPatternField ? editField : undefined}
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
                                onEditField={canEditIndexPatternField ? editField : undefined}
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
                            onEditField={canEditIndexPatternField ? editField : undefined}
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
