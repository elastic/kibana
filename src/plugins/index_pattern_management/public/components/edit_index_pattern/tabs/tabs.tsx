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
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiFieldSearch,
  EuiSelect,
  EuiSelectOption,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fieldWildcardMatcher } from '../../../../../kibana_utils/public';
import {
  IndexPattern,
  IndexPatternField,
  UI_SETTINGS,
  DataPublicPluginStart,
} from '../../../../../../plugins/data/public';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { getTabs, getPath, convertToEuiSelectOption } from './utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: IndexPattern;
  fields: IndexPatternField[];
  saveIndexPattern: DataPublicPluginStart['indexPatterns']['updateSavedObject'];
  refreshFields: () => void;
}

const searchAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.searchAria',
  {
    defaultMessage: 'Search fields',
  }
);

const filterAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterAria',
  {
    defaultMessage: 'Filter field types',
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
  const {
    uiSettings,
    indexPatternManagementStart,
    docLinks,
    indexPatternFieldEditor,
  } = useKibana<IndexPatternManagmentContext>().services;
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string>('');
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string>('');
  const [indexedFieldTypes, setIndexedFieldType] = useState<EuiSelectOption[]>([]);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<EuiSelectOption[]>([]);
  const [syncingStateFunc, setSyncingStateFunc] = useState<any>({
    getCurrentTab: () => TAB_INDEXED_FIELDS,
  });
  const closeEditorHandler = useRef<() => void | undefined>();
  const { DeleteRuntimeFieldProvider } = indexPatternFieldEditor;

  const refreshFilters = useCallback(() => {
    const tempIndexedFieldTypes: string[] = [];
    const tempScriptedFieldLanguages: string[] = [];
    indexPattern.fields.getAll().forEach((field) => {
      if (field.scripted) {
        if (field.lang) {
          tempScriptedFieldLanguages.push(field.lang);
        }
      } else {
        if (field.esTypes) {
          tempIndexedFieldTypes.push(field.esTypes?.join(', '));
        }
      }
    });

    setIndexedFieldType(convertToEuiSelectOption(tempIndexedFieldTypes, 'indexedFiledTypes'));
    setScriptedFieldLanguages(
      convertToEuiSelectOption(tempScriptedFieldLanguages, 'scriptedFieldLanguages')
    );
  }, [indexPattern]);

  const closeFieldEditor = useCallback(() => {
    if (closeEditorHandler.current) {
      closeEditorHandler.current();
    }
  }, []);

  const openFieldEditor = useCallback(
    (fieldName?: string) => {
      closeEditorHandler.current = indexPatternFieldEditor.openEditor({
        ctx: {
          indexPattern,
        },
        onSave: refreshFields,
        fieldName,
      });
    },
    [indexPatternFieldEditor, indexPattern, refreshFields]
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
    (filters: string[]) => fieldWildcardMatcher(filters, uiSettings.get(UI_SETTINGS.META_FIELDS)),
    [uiSettings]
  );

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
                <EuiSelect
                  options={indexedFieldTypes}
                  value={indexedFieldTypeFilter}
                  onChange={(e) => setIndexedFieldTypeFilter(e.target.value)}
                  data-test-subj="indexedFieldTypeFilterDropdown"
                  aria-label={filterAriaLabel}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={() => openFieldEditor()} data-test-subj="addField">
                  {addFieldButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
          {type === TAB_SCRIPTED_FIELDS && scriptedFieldLanguages.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={scriptedFieldLanguages}
                value={scriptedFieldLanguageFilter}
                onChange={(e) => setScriptedFieldLanguageFilter(e.target.value)}
                data-test-subj="scriptedFieldLanguageFilterDropdown"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [
      fieldFilter,
      indexedFieldTypeFilter,
      indexedFieldTypes,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
      openFieldEditor,
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
              <DeleteRuntimeFieldProvider indexPattern={indexPattern} onDelete={refreshFields}>
                {(deleteField) => (
                  <IndexedFieldsTable
                    fields={fields}
                    indexPattern={indexPattern}
                    fieldFilter={fieldFilter}
                    fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                    indexedFieldTypeFilter={indexedFieldTypeFilter}
                    helpers={{
                      editField: openFieldEditor,
                      deleteField,
                      getFieldInfo: indexPatternManagementStart.list.getFieldInfo,
                    }}
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
                  redirectToRoute: (field: IndexPatternField) => {
                    history.push(getPath(field, indexPattern));
                  },
                }}
                onRemoveField={refreshFilters}
                painlessDocLink={docLinks.links.scriptedFields.painless}
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
      indexPatternManagementStart.list.getFieldInfo,
      indexedFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      saveIndexPattern,
      openFieldEditor,
      DeleteRuntimeFieldProvider,
      refreshFields,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter, indexPatternManagementStart.list).map(
        (tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
          return {
            ...tab,
            content: getContent(tab.id),
          };
        }
      ),
    [fieldFilter, getContent, indexPattern, indexPatternManagementStart.list]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      getCurrentTab,
    } = createEditIndexPatternPageStateContainer({
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
