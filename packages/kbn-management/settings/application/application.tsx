/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, Query } from '@elastic/eui';
import { i18n as i18nLib } from '@kbn/i18n';

import { Form } from '@kbn/management-settings-components-form';
import { categorizeFields } from '@kbn/management-settings-utilities';

import { useFields } from './hooks/use_fields';
import { QueryInput, QueryInputProps } from './query_input';
import { EmptyState } from './empty_state';
import { useServices } from './services';

const title = i18nLib.translate('management.settings.advancedSettingsLabel', {
  defaultMessage: 'Advanced Settings',
});

export const DATA_TEST_SUBJ_SETTINGS_TITLE = 'managementSettingsTitle';

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

/**
 * Component for displaying the {@link SettingsApplication} component.
 */
export const SettingsApplication = () => {
  const { addUrlToHistory } = useServices();

  const queryParam = getQueryParam(window.location.href);
  const [query, setQuery] = useState<Query>(Query.parse(queryParam));

  const allFields = useFields();
  const filteredFields = useFields(query);

  const onQueryChange: QueryInputProps['onQueryChange'] = (newQuery = Query.parse('')) => {
    setQuery(newQuery);

    const search = addQueryParam(window.location.href, 'query', newQuery.text);
    addUrlToHistory(search);
  };

  const categorizedFields = categorizeFields(allFields);
  const categories = Object.keys(categorizedFields);
  const categoryCounts: { [category: string]: number } = {};
  for (const category of categories) {
    categoryCounts[category] = categorizedFields[category].count;
  }

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <h1 data-test-subj={DATA_TEST_SUBJ_SETTINGS_TITLE}>{title}</h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryInput {...{ categories, query, onQueryChange }} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      {filteredFields.length ? (
        <Form
          fields={filteredFields}
          categoryCounts={categoryCounts}
          isSavingEnabled={true}
          onClearQuery={() => onQueryChange()}
        />
      ) : (
        <EmptyState {...{ queryText: query?.text, onClearQuery: () => onQueryChange() }} />
      )}
    </div>
  );
};
