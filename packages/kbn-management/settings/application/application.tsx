/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, Query, EuiTabs } from '@elastic/eui';
import { categorizeFields } from '@kbn/management-settings-utilities';

import { CategorizedFields } from '@kbn/management-settings-types';
import { i18nTexts } from './i18n_texts';
import { Tab } from './tab';
import { TabContent } from './tab_content';
import { useFields } from './hooks/use_fields';
import { QueryInput, QueryInputProps } from './query_input';
import { useServices } from './services';

export const DATA_TEST_SUBJ_SETTINGS_TITLE = 'managementSettingsTitle';
export const SPACE_SETTINGS_TAB_ID = 'space-settings';
export const GLOBAL_SETTINGS_TAB_ID = 'global-settings';

function addQueryParam(url: string, param: string, value: string) {
  const urlObj = new URL(url);
  if (value) {
    urlObj.searchParams.set(param, value);
  } else {
    urlObj.searchParams.delete(param);
  }

  return urlObj.search;
}

function getQueryParam(url: string) {
  if (url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('query') || '';
  }
  return '';
}

function getCategoryCounts(categorizedFields: CategorizedFields) {
  const categoryCounts: { [category: string]: number } = {};
  Object.entries(categorizedFields).forEach(
    ([category, value]) => (categoryCounts[category] = value.count)
  );
  return categoryCounts;
}

/**
 * Component for displaying the {@link SettingsApplication} component.
 */
export const SettingsApplication = () => {
  const { addUrlToHistory } = useServices();

  const queryParam = getQueryParam(window.location.href);
  const [query, setQuery] = useState<Query>(Query.parse(queryParam));

  const onQueryChange: QueryInputProps['onQueryChange'] = (newQuery = Query.parse('')) => {
    setQuery(newQuery);

    const search = addQueryParam(window.location.href, 'query', newQuery.text);
    addUrlToHistory(search);
  };

  const spaceAllFields = useFields('namespace');
  const spaceCategorizedFields = categorizeFields(spaceAllFields);
  const spaceCategoryCounts = getCategoryCounts(spaceCategorizedFields);
  const spaceFilteredFields = useFields('namespace', query);

  const globalAllFields = useFields('global');
  const globalCategorizedFields = categorizeFields(globalAllFields);
  const globalCategoryCounts = getCategoryCounts(globalCategorizedFields);
  const globalFilteredFields = useFields('global', query);

  const globalSettingsEnabled = globalAllFields.length > 0;

  const tabs = [
    {
      id: SPACE_SETTINGS_TAB_ID,
      name: i18nTexts.defaultSpaceTabTitle,
      content: (
        <TabContent
          isGlobal={false}
          fields={spaceFilteredFields}
          query={query}
          onClearQuery={() => onQueryChange()}
          callOutEnabled={globalSettingsEnabled}
          categoryCounts={spaceCategoryCounts}
        />
      ),
    },
  ];
  if (globalSettingsEnabled) {
    tabs.push({
      id: GLOBAL_SETTINGS_TAB_ID,
      name: i18nTexts.globalTabTitle,
      content: (
        <TabContent
          isGlobal={true}
          fields={globalFilteredFields}
          query={query}
          onClearQuery={() => onQueryChange()}
          callOutEnabled={true}
          categoryCounts={globalCategoryCounts}
        />
      ),
    });
  }

  const [selectedTabId, setSelectedTabId] = useState(SPACE_SETTINGS_TAB_ID);
  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const queryCategories =
    selectedTabId === SPACE_SETTINGS_TAB_ID
      ? Object.keys(spaceCategorizedFields)
      : Object.keys(globalCategorizedFields);

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <h1 data-test-subj={DATA_TEST_SUBJ_SETTINGS_TITLE}>
              {i18nTexts.advancedSettingsTitle}
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryInput {...{ categories: queryCategories, query, onQueryChange }} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {globalSettingsEnabled && (
        <EuiTabs>
          {tabs.map((tab, index) => (
            <Tab
              id={tab.id}
              name={tab.name}
              onSelectedTabChanged={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
            />
          ))}
        </EuiTabs>
      )}
      {selectedTabContent}
    </div>
  );
};
