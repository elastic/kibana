/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
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
  EuiFilterSelectItem,
  FilterChecked,
  EuiToolTip,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fieldWildcardMatcher } from '@kbn/kibana-utils-plugin/public';
import {
  DataView,
  DataViewField,
  DataViewsPublicPluginStart,
  META_FIELDS,
  RuntimeField,
} from '@kbn/data-views-plugin/public';
import {
  SavedObjectRelation,
  SavedObjectManagementTypeInfo,
} from '@kbn/saved-objects-management-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../types';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import {
  TAB_INDEXED_FIELDS,
  TAB_SCRIPTED_FIELDS,
  TAB_SOURCE_FILTERS,
  TAB_RELATIONSHIPS,
} from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { RelationshipsTable } from '../relationships_table';
import { getTabs, getPath, convertToEuiFilterOptions } from './utils';
import { getFieldInfo } from '../../utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: DataView;
  fields: DataViewField[];
  saveIndexPattern: DataViewsPublicPluginStart['updateSavedObject'];
  refreshFields: () => void;
  relationships: SavedObjectRelation[];
  allowedTypes: SavedObjectManagementTypeInfo[];
  compositeRuntimeFields: Record<string, RuntimeField>;
  refreshIndexPatternClick: () => void;
  isRefreshing?: boolean;
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

const refreshAriaLabel = i18n.translate('indexPatternManagement.editDataView.refreshAria', {
  defaultMessage: 'Refresh',
});

const refreshTooltip = i18n.translate('indexPatternManagement.editDataView.refreshTooltip', {
  defaultMessage: 'Refresh local copy of data view field list',
});

const SCHEMA_ITEMS: FilterItems[] = [
  {
    value: 'runtime',
    name: schemaOptionRuntime,
  },
  {
    value: 'indexed',
    name: schemaOptionIndexed,
  },
];

export const Tabs: React.FC<TabsProps> = ({
  indexPattern,
  saveIndexPattern,
  fields,
  history,
  refreshFields,
  relationships,
  allowedTypes,
  compositeRuntimeFields,
  refreshIndexPatternClick,
  isRefreshing,
}) => {
  const {
    uiSettings,
    docLinks,
    dataViewFieldEditor,
    overlays,
    dataViews,
    http,
    application,
    savedObjectsManagement,
    ...startServices
  } = useKibana<IndexPatternManagmentContext>().services;
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [syncingStateFunc, setSyncingStateFunc] = useState<{
    setCurrentTab?: (newTab: string) => { tab: string };
    setCurrentFieldFilter?: (newFieldFilter: string | undefined) => {
      fieldFilter: string | undefined;
    };
    setCurrentFieldTypes?: (newFieldTypes: string[] | undefined) => {
      fieldTypes: string[] | undefined;
    };
    setCurrentSchemaFieldTypes?: (newSchemaFieldTypes: string[] | undefined) => {
      schemaFieldTypes: string[] | undefined;
    };
  }>({});
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string[]>([]);
  const [isScriptedFieldFilterOpen, setIsScriptedFieldFilterOpen] = useState(false);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<FilterItems[]>([]);
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string[]>([]);
  const [isIndexedFilterOpen, setIsIndexedFilterOpen] = useState(false);
  const [indexedFieldTypes, setIndexedFieldTypes] = useState<FilterItems[]>([]);
  const [schemaFieldTypeFilter, setSchemaFieldTypeFilter] = useState<string[]>([]);
  const [isSchemaFilterOpen, setIsSchemaFilterOpen] = useState(false);
  const closeEditorHandler = useRef<() => void | undefined>();
  const { DeleteRuntimeFieldProvider } = dataViewFieldEditor;

  const filteredIndexedFieldTypeFilter = useMemo(() => {
    return uniq(
      indexedFieldTypeFilter.filter((fieldType) =>
        indexedFieldTypes.some((item) => item.value === fieldType)
      )
    );
  }, [indexedFieldTypeFilter, indexedFieldTypes]);

  const filteredSchemaFieldTypeFilter = useMemo(() => {
    return uniq(
      schemaFieldTypeFilter.filter((schemaFieldType) =>
        SCHEMA_ITEMS.some((item) => item.value === schemaFieldType)
      )
    );
  }, [schemaFieldTypeFilter]);

  const updateTab = useCallback(
    (tab: Pick<EuiTabbedContentTab, 'id'>) => {
      syncingStateFunc.setCurrentTab?.(tab.id);
    },
    [syncingStateFunc]
  );

  const updateFieldTypeFilter = useCallback(
    (newIndexedFieldTypeFilter: string[]) => {
      syncingStateFunc?.setCurrentFieldTypes?.(newIndexedFieldTypeFilter);
    },
    [syncingStateFunc]
  );

  const updateSchemaFieldTypeFilter = useCallback(
    (newSchemaFieldTypeFilter: string[]) => {
      syncingStateFunc?.setCurrentSchemaFieldTypes?.(newSchemaFieldTypeFilter);
    },
    [syncingStateFunc]
  );

  const updateFieldFilter = useCallback(
    (newFieldFilter: string) => {
      syncingStateFunc?.setCurrentFieldFilter?.(newFieldFilter || undefined);
    },
    [syncingStateFunc]
  );

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
    // need to reset based on changes to fields but indexPattern is the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern, fields]);

  const closeFieldEditor = useCallback(() => {
    if (closeEditorHandler.current) {
      closeEditorHandler.current();
    }
  }, []);

  const openFieldEditor = useCallback(
    async (fieldName?: string) => {
      closeEditorHandler.current = await dataViewFieldEditor.openEditor({
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
    (filters: string[] | undefined) => fieldWildcardMatcher(filters, uiSettings.get(META_FIELDS)),
    [uiSettings]
  );

  const refreshRef = useRef<HTMLButtonElement>(null);

  const userEditPermission = dataViews.getCanSaveSync();
  const getFilterSection = useCallback(
    (type: string) => {
      return (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              fullWidth
              placeholder={filterPlaceholder}
              value={fieldFilter}
              onChange={(e) => updateFieldFilter(e.target.value)}
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
                        hasActiveFilters={filteredIndexedFieldTypeFilter.length > 0}
                        numActiveFilters={filteredIndexedFieldTypeFilter.length}
                      >
                        {filterLabel}
                      </EuiFilterButton>
                    }
                    isOpen={isIndexedFilterOpen}
                    closePopover={() => setIsIndexedFilterOpen(false)}
                  >
                    {indexedFieldTypes.map((item) => {
                      const isSelected = filteredIndexedFieldTypeFilter.includes(item.value);
                      return (
                        <EuiFilterSelectItem
                          checked={isSelected ? 'on' : undefined}
                          key={item.value}
                          onClick={() => {
                            updateFieldTypeFilter(
                              isSelected
                                ? filteredIndexedFieldTypeFilter.filter((f) => f !== item.value)
                                : [...filteredIndexedFieldTypeFilter, item.value]
                            );
                          }}
                          data-test-subj={`indexedFieldTypeFilterDropdown-option-${item.value}${
                            isSelected ? '-checked' : ''
                          }`}
                        >
                          {item.name}
                        </EuiFilterSelectItem>
                      );
                    })}
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
                        numFilters={SCHEMA_ITEMS.length}
                        hasActiveFilters={filteredSchemaFieldTypeFilter.length > 0}
                        numActiveFilters={filteredSchemaFieldTypeFilter.length}
                      >
                        {schemaFilterLabel}
                      </EuiFilterButton>
                    }
                    isOpen={isSchemaFilterOpen}
                    closePopover={() => setIsSchemaFilterOpen(false)}
                  >
                    {SCHEMA_ITEMS.map((item) => {
                      const isSelected = filteredSchemaFieldTypeFilter.includes(item.value);
                      return (
                        <EuiFilterSelectItem
                          checked={isSelected ? 'on' : undefined}
                          key={item.value}
                          onClick={() => {
                            updateSchemaFieldTypeFilter(
                              isSelected
                                ? filteredSchemaFieldTypeFilter.filter((f) => f !== item.value)
                                : [...filteredSchemaFieldTypeFilter, item.value]
                            );
                          }}
                          data-test-subj={`schemaFieldTypeFilterDropdown-option-${item.value}${
                            isSelected ? '-checked' : ''
                          }`}
                        >
                          {item.name}
                        </EuiFilterSelectItem>
                      );
                    })}
                  </EuiPopover>
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={<p>{refreshTooltip}</p>}>
                  <EuiButton
                    buttonRef={refreshRef}
                    onClick={() => {
                      refreshIndexPatternClick();
                      // clear tooltip focus
                      if (refreshRef.current) {
                        refreshRef.current.blur();
                      }
                    }}
                    iconType="refresh"
                    aria-label={refreshAriaLabel}
                    data-test-subj="refreshDataViewButton"
                    isLoading={isRefreshing}
                    isDisabled={isRefreshing}
                    size="m"
                    color="success"
                    className="eui-fullWidth"
                  >
                    {refreshAriaLabel}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
              {userEditPermission && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="m"
                    onClick={() => openFieldEditor()}
                    data-test-subj="addField"
                    iconType="plusInCircle"
                    aria-label={addFieldButtonLabel}
                    color="primary"
                    fill
                  >
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
      filteredSchemaFieldTypeFilter,
      filteredIndexedFieldTypeFilter,
      indexedFieldTypes,
      isIndexedFilterOpen,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
      isScriptedFieldFilterOpen,
      isSchemaFilterOpen,
      openFieldEditor,
      userEditPermission,
      updateFieldFilter,
      updateFieldTypeFilter,
      updateSchemaFieldTypeFilter,
      isRefreshing,
      refreshIndexPatternClick,
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
                    compositeRuntimeFields={compositeRuntimeFields}
                    indexPattern={indexPattern}
                    fieldFilter={fieldFilter}
                    fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                    indexedFieldTypeFilter={filteredIndexedFieldTypeFilter}
                    schemaFieldTypeFilter={filteredSchemaFieldTypeFilter}
                    helpers={{
                      editField: openFieldEditor,
                      deleteField,
                      getFieldInfo,
                    }}
                    openModal={overlays.openModal}
                    userEditPermission={dataViews.getCanSaveSync()}
                    startServices={startServices}
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
        case TAB_RELATIONSHIPS:
          return (
            <Fragment>
              <EuiSpacer size="m" />
              <RelationshipsTable
                basePath={http.basePath}
                id={indexPattern.id!}
                capabilities={application.capabilities}
                relationships={relationships}
                allowedTypes={allowedTypes}
                navigateToUrl={application.navigateToUrl}
                getDefaultTitle={savedObjectsManagement.getDefaultTitle}
                getSavedObjectLabel={savedObjectsManagement.getSavedObjectLabel}
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
      filteredIndexedFieldTypeFilter,
      filteredSchemaFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      saveIndexPattern,
      openFieldEditor,
      DeleteRuntimeFieldProvider,
      refreshFields,
      overlays,
      startServices,
      dataViews,
      compositeRuntimeFields,
      http,
      application,
      savedObjectsManagement,
      allowedTypes,
      relationships,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter, relationships.length, dataViews.scriptedFieldsEnabled).map(
        (tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
          return {
            ...tab,
            content: getContent(tab.id),
          };
        }
      ),
    [fieldFilter, getContent, indexPattern, relationships, dataViews.scriptedFieldsEnabled]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      setCurrentFieldTypes,
      setCurrentFieldFilter,
      setCurrentSchemaFieldTypes,
      stateContainer,
    } = createEditIndexPatternPageStateContainer({
      useHashedUrl: uiSettings.get('state:storeInSessionStorage'),
      defaultTab: TAB_INDEXED_FIELDS,
    });

    startSyncingState();
    setSyncingStateFunc({
      setCurrentTab,
      setCurrentFieldTypes,
      setCurrentFieldFilter,
      setCurrentSchemaFieldTypes,
    });

    setSelectedTabId(stateContainer.selectors.tab());
    setIndexedFieldTypeFilter((currentValue) => stateContainer.selectors.fieldTypes() ?? []);
    setSchemaFieldTypeFilter((currentValue) => stateContainer.selectors.schemaFieldTypes() ?? []);
    setFieldFilter((currentValue) => stateContainer.selectors.fieldFilter() ?? '');

    const stateSubscription = stateContainer.state$.subscribe(() => {
      setSelectedTabId(stateContainer.selectors.tab());
      setIndexedFieldTypeFilter((currentValue) => stateContainer.selectors.fieldTypes() ?? []);
      setSchemaFieldTypeFilter((currentValue) => stateContainer.selectors.schemaFieldTypes() ?? []);
      setFieldFilter((currentValue) => stateContainer.selectors.fieldFilter() ?? '');
    });

    return () => {
      stateSubscription.unsubscribe();
      stopSyncingState();
    };
  }, [uiSettings]);

  return (
    <EuiTabbedContent
      tabs={euiTabs}
      selectedTab={euiTabs.find((tab) => tab.id === selectedTabId)}
      onTabClick={updateTab}
    />
  );
};
