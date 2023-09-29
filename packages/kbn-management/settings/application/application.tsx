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

/**
 * Component for displaying the {@link SettingsApplication} component.
 */
export const SettingsApplication = () => {
  const { addUrlToHistory } = useServices();
  const fields = useFields();
  const categories = Object.keys(categorizeFields(fields));
  const [filteredFields, setFilteredFields] = useState(fields);

  const onQueryChange: QueryInputProps['onQueryChange'] = (query) => {
    if (!query) {
      setFilteredFields(fields);
      return;
    }

    const newFields = Query.execute(query, fields);
    setFilteredFields(newFields);

    const search = addQueryParam(window.location.href, 'query', query.text);
    addUrlToHistory(search);
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <h1 data-test-subj={DATA_TEST_SUBJ_SETTINGS_TITLE}>{title}</h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryInput {...{ categories, onQueryChange }} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <Form fields={filteredFields} isSavingEnabled={true} />
    </>
  );
};
