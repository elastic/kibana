/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';
import { useFilePickerContext } from '../context';
import { useBehaviorSubject } from '../../use_behavior_subject';

export const SearchField: FunctionComponent = () => {
  const { state } = useFilePickerContext();
  const query = useBehaviorSubject(state.query$);
  const isLoading = useBehaviorSubject(state.isLoading$);
  const hasFiles = useBehaviorSubject(state.hasFiles$);
  return (
    <EuiFieldSearch
      data-test-subj="searchField"
      disabled={!query && !hasFiles}
      isLoading={isLoading}
      value={query ?? ''}
      placeholder={i18nTexts.searchFieldPlaceholder}
      onChange={(ev) => state.setQuery(ev.target.value)}
    />
  );
};
