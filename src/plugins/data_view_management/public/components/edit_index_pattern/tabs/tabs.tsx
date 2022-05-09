/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect, Fragment, useMemo, useRef } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiFieldSearch,
  EuiButton,
  EuiFilterSelectItem,
  FilterChecked,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fieldWildcardMatcher } from '@kbn/kibana-utils-plugin/public';
import {
  DataView,
  DataViewField,
  DataViewsPublicPluginStart,
  META_FIELDS,
} from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../types';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { getTabs, getPath, convertToEuiFilterOptions } from './utils';
import { getFieldInfo } from '../../utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: DataView;
  fields: DataViewField[];
  saveIndexPattern: DataViewsPublicPluginStart['updateSavedObject'];
  refreshFields: () => void;
}

interface FilterItems {
  value: string;
  name: string;
  checked?: FilterChecked;
}

const searchAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.searchAria',
  {
    defaultMessage: 'Search fields',
  }
);

const filterLabel = i18n.translate('indexPatternManagement.editIndexPattern.fields.filter', {
  defaultMessage: 'Field type',
});

const filterAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterAria',
  {
    defaultMessage: 'Filter field types',
  }
);

const schemaFilterLabel = i18n.translate('indexPatternManagement.editIndexPattern.fields.schema', {
  defaultMessage: 'Schema type',
});

const schemaAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.schemaAria',
  {
    defaultMessage: 'Filter schema types',
  }
);

const scriptedFieldFilterLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.scriptedFieldFilter',
  {
    defaultMessage: 'All languages',
  }
);

const scriptedFieldAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.scriptedFieldFilterAria',
  {
    defaultMessage: 'Filter scripted field languages',
  }
);

const schemaOptionRuntime = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.runtime',
  {
    defaultMessage: 'Runtime',
  }
);

const schemaOptionIndexed = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.indexed',
  {
    defaultMessage: 'Indexed',
  }
);

const filterPlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

const addFieldButtonLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.addFieldButtonLabel',
  {
    defaultMessage: 'Add field',
  }
);

export function Tabs({
  indexPattern,
  saveIndexPattern,
  fields,
  history,
  location,
  refreshFields,
}: TabsProps) {
  const { uiSettings, docLinks, dataViewFieldEditor, overlays, theme, dataViews } =
    useKibana<IndexPatternManagmentContext>().services;
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [syncingStateFunc, setSyncingStateFunc] = useState<any>({
    getCurrentTab: () => TAB_INDEXED_FIELDS,
  });
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string[]>([]);
  const [isScriptedFieldFilterOpen, setIsScriptedFieldFilterOpen] = useState(false);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<FilterItems[]>([]);
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string[]>([]);
  const [isIndexedFilterOpen, setIsIndexedFilterOpen] = useState(false);
  const [indexedFieldTypes, setIndexedFieldTypes] = useState<FilterItems[]>([]);
  const [schemaFieldTypeFilter, setSchemaFieldTypeFilter] = useState<string[]>([]);
  const [isSchemaFilterOpen, setIsSchemaFilterOpen] = useState(false);
  const [schemaItems, setSchemaItems] = useState<FilterItems[]>([
    {
      value: 'runtime',
      name: schemaOptionRuntime,
    },
    {
      value: 'indexed',
      name: schemaOptionIndexed,
    },
  ]);
  const closeEditorHandler = useRef<() => void | undefined>();
  const { DeleteRuntimeFieldProvider } = dataViewFieldEditor;

  const updateFilterItem = (
    items: FilterItems[],
    index: number,
    updater: (a: FilterItems[]) => void
  ) => {
    if (!items[index]) {
      return;
    }

    const newItems = [...items];

    switch (newItems[index].checked) {
      case 'on':
        newItems[index].checked = undefined;
        break;

      default:
        newItems[index].checked = 'on';
    }

    updater(newItems);
  };

  const refreshFilters = useCallback(() => {
    const tempIndexedFieldTypes: string[] = [];
    const tempScriptedFieldLanguages: string[] = [];
    indexPattern.fields.getAll().forEach((field) => {
      if (field.scripted) {
        if (field.lang) {
          tempScriptedFieldLanguages.push(field.lang);
        }
      } else {
        // for conflicted fields, add conflict as a type
        if (field.type === 'conflict') {
          tempIndexedFieldTypes.push('conflict');
        }
        if (field.esTypes) {
          // add all types, may be multiple
          field.esTypes.forEach((item) => tempIndexedFieldTypes.push(item));
        }
      }
    });

    setIndexedFieldTypes(convertToEuiFilterOptions(tempIndexedFieldTypes));
    setScriptedFieldLanguages(convertToEuiFilterOptions(tempScriptedFieldLanguages));
  }, [indexPattern]);

  const closeFieldEditor = useCallback(() => {
    if (closeEditorHandler.current) {
      closeEditorHandler.current();
    }
  }, []);

  const openFieldEditor = useCallback(
    (fieldName?: string) => {
      closeEditorHandler.current = dataViewFieldEditor.openEditor({
        ctx: {
          dataView: indexPattern,
        },
        onSave: refreshFields,
        fieldName,
      });
    },
    [dataViewFieldEditor, indexPattern, refreshFields]
  );

  useEffect(() => {
    refreshFilters();
  }, [indexPattern, indexPattern.fields, refreshFilters]);

  useEffect(() => {
    return () => {
      // When the component unmounts, make sure to close the field editor
      closeFieldEditor();
    };
  }, [closeFieldEditor]);

  const fieldWildcardMatcherDecorated = useCallback(
    (filters: string[]) => fieldWildcardMatcher(filters, uiSettings.get(META_FIELDS)),
    [uiSettings]
  );

  const userEditPermission = dataViews.getCanSaveSync();
  const getFilterSection = useCallback(
    (type: string) => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              fullWidth
              placeholder={filterPlaceholder}
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              data-test-subj="indexPatternFieldFilter"
              aria-label={searchAriaLabel}
            />
          </EuiFlexItem>
          {type === TAB_INDEXED_FIELDS && indexedFieldTypes.length > 0 && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <EuiPopover
                    anchorPosition="downCenter"
                    data-test-subj="indexedFieldTypeFilterDropdown-popover"
                    button={
                      <EuiFilterButton
                        aria-label={filterAriaLabel}
                        data-test-subj="indexedFieldTypeFilterDropdown"
                        iconType="arrowDown"
                        onClick={() => setIsIndexedFilterOpen(!isIndexedFilterOpen)}
                        isSelected={isIndexedFilterOpen}
                        numFilters={indexedFieldTypes.length}
                        hasActiveFilters={!!indexedFieldTypes.find((item) => item.checked === 'on')}
                        numActiveFilters={
                          indexedFieldTypes.filter((item) => item.checked === 'on').length
                        }
                      >
                        {filterLabel}
                      </EuiFilterButton>
                    }
                    isOpen={isIndexedFilterOpen}
                    closePopover={() => setIsIndexedFilterOpen(false)}
                  >
                    {indexedFieldTypes.map((item, index) => (
                      <EuiFilterSelectItem
                        checked={item.checked}
                        key={item.value}
                        onClick={() => {
                          setIndexedFieldTypeFilter(
                            item.checked
                              ? indexedFieldTypeFilter.filter((f) => f !== item.value)
                              : [...indexedFieldTypeFilter, item.value]
                          );
                          updateFilterItem(indexedFieldTypes, index, setIndexedFieldTypes);
                        }}
                        data-test-subj={`indexedFieldTypeFilterDropdown-option-${item.value}${
                          item.checked ? '-checked' : ''
                        }`}
                      >
                        {item.name}
                      </EuiFilterSelectItem>
                    ))}
                  </EuiPopover>
                  <EuiPopover
                    anchorPosition="downCenter"
                    data-test-subj="schemaFieldTypeFilterDropdown-popover"
                    button={
                      <EuiFilterButton
                        aria-label={schemaAriaLabel}
                        data-test-subj="schemaFieldTypeFilterDropdown"
                        iconType="arrowDown"
                        onClick={() => setIsSchemaFilterOpen(!isSchemaFilterOpen)}
                        isSelected={isSchemaFilterOpen}
                        numFilters={schemaItems.length}
                        hasActiveFilters={!!schemaItems.find((item) => item.checked === 'on')}
                        numActiveFilters={
                          schemaItems.filter((item) => item.checked === 'on').length
                        }
                      >
                        {schemaFilterLabel}
                      </EuiFilterButton>
                    }
                    isOpen={isSchemaFilterOpen}
                    closePopover={() => setIsSchemaFilterOpen(false)}
                  >
                    {schemaItems.map((item, index) => (
                      <EuiFilterSelectItem
                        checked={item.checked}
                        key={item.value}
                        onClick={() => {
                          setSchemaFieldTypeFilter(
                            item.checked
                              ? schemaFieldTypeFilter.filter((f) => f !== item.value)
                              : [...schemaFieldTypeFilter, item.value]
                          );
                          updateFilterItem(schemaItems, index, setSchemaItems);
                        }}
                        data-test-subj={`schemaFieldTypeFilterDropdown-option-${item.value}${
                          item.checked ? '-checked' : ''
                        }`}
                      >
                        {item.name}
                      </EuiFilterSelectItem>
                    ))}
                  </EuiPopover>
                </EuiFilterGroup>
              </EuiFlexItem>
              {userEditPermission && (
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={() => openFieldEditor()} data-test-subj="addField">
                    {addFieldButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </>
          )}
          {type === TAB_SCRIPTED_FIELDS && scriptedFieldLanguages.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  anchorPosition="downCenter"
                  data-test-subj="scriptedFieldLanguageFilterDropdown-popover"
                  button={
                    <EuiFilterButton
                      aria-label={scriptedFieldAriaLabel}
                      data-test-subj="scriptedFieldLanguageFilterDropdown"
                      iconType="arrowDown"
                      onClick={() => setIsScriptedFieldFilterOpen(!isScriptedFieldFilterOpen)}
                      isSelected={isScriptedFieldFilterOpen}
                      numFilters={scriptedFieldLanguages.length}
                      hasActiveFilters={
                        !!scriptedFieldLanguages.find((item) => item.checked === 'on')
                      }
                      numActiveFilters={
                        scriptedFieldLanguages.filter((item) => item.checked === 'on').length
                      }
                    >
                      {scriptedFieldFilterLabel}
                    </EuiFilterButton>
                  }
                  isOpen={isScriptedFieldFilterOpen}
                  closePopover={() => setIsScriptedFieldFilterOpen(false)}
                >
                  {scriptedFieldLanguages.map((item, index) => (
                    <EuiFilterSelectItem
                      checked={item.checked}
                      key={item.value}
                      onClick={() => {
                        setScriptedFieldLanguageFilter(
                          item.checked
                            ? scriptedFieldLanguageFilter.filter((f) => f !== item.value)
                            : [...scriptedFieldLanguageFilter, item.value]
                        );
                        updateFilterItem(scriptedFieldLanguages, index, setScriptedFieldLanguages);
                      }}
                      data-test-subj={`scriptedFieldLanguageFilterDropdown-option-${item.value}${
                        item.checked ? '-checked' : ''
                      }`}
                    >
                      {item.name}
                    </EuiFilterSelectItem>
                  ))}
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [
      fieldFilter,
      indexedFieldTypeFilter,
      indexedFieldTypes,
      isIndexedFilterOpen,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
      isScriptedFieldFilterOpen,
      schemaItems,
      schemaFieldTypeFilter,
      isSchemaFilterOpen,
      openFieldEditor,
      userEditPermission,
    ]
  );

  const getContent = useCallback(
    (type: string) => {
      switch (type) {
        case TAB_INDEXED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <DeleteRuntimeFieldProvider dataView={indexPattern} onDelete={refreshFields}>
                {(deleteField) => (
                  <IndexedFieldsTable
                    fields={fields}
                    indexPattern={indexPattern}
                    fieldFilter={fieldFilter}
                    fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                    indexedFieldTypeFilter={indexedFieldTypeFilter}
                    schemaFieldTypeFilter={schemaFieldTypeFilter}
                    helpers={{
                      editField: openFieldEditor,
                      deleteField,
                      getFieldInfo,
                    }}
                    openModal={overlays.openModal}
                    theme={theme!}
                    userEditPermission={dataViews.getCanSaveSync()}
                  />
                )}
              </DeleteRuntimeFieldProvider>
            </Fragment>
          );
        case TAB_SCRIPTED_FIELDS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <ScriptedFieldsTable
                indexPattern={indexPattern}
                saveIndexPattern={saveIndexPattern}
                fieldFilter={fieldFilter}
                scriptedFieldLanguageFilter={scriptedFieldLanguageFilter}
                helpers={{
                  redirectToRoute: (field: DataViewField) => {
                    history.push(getPath(field, indexPattern));
                  },
                }}
                onRemoveField={refreshFilters}
                painlessDocLink={docLinks.links.scriptedFields.painless}
                userEditPermission={dataViews.getCanSaveSync()}
              />
            </Fragment>
          );
        case TAB_SOURCE_FILTERS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              {getFilterSection(type)}
              <EuiSpacer size="m" />
              <SourceFiltersTable
                saveIndexPattern={saveIndexPattern}
                indexPattern={indexPattern}
                filterFilter={fieldFilter}
                fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                onAddOrRemoveFilter={refreshFilters}
              />
            </Fragment>
          );
      }
    },
    [
      docLinks.links.scriptedFields.painless,
      fieldFilter,
      fieldWildcardMatcherDecorated,
      fields,
      getFilterSection,
      history,
      indexPattern,
      indexedFieldTypeFilter,
      schemaFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      saveIndexPattern,
      openFieldEditor,
      DeleteRuntimeFieldProvider,
      refreshFields,
      overlays,
      theme,
      dataViews,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter).map((tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
        return {
          ...tab,
          content: getContent(tab.id),
        };
      }),
    [fieldFilter, getContent, indexPattern]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const { startSyncingState, stopSyncingState, setCurrentTab, getCurrentTab } =
      createEditIndexPatternPageStateContainer({
        useHashedUrl: uiSettings.get('state:storeInSessionStorage'),
        defaultTab: TAB_INDEXED_FIELDS,
      });

    startSyncingState();
    setSyncingStateFunc({
      setCurrentTab,
      getCurrentTab,
    });
    setSelectedTabId(getCurrentTab());

    return () => {
      stopSyncingState();
    };
  }, [uiSettings]);

  return (
    <EuiTabbedContent
      tabs={euiTabs}
      selectedTab={euiTabs.find((tab) => tab.id === selectedTabId)}
      onTabClick={(tab) => {
        setSelectedTabId(tab.id);
        syncingStateFunc.setCurrentTab(tab.id);
      }}
    />
  );
}
