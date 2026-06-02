/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiText, type Query } from '@elastic/eui';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from '@kbn/content-list-toolbar';
import type { ResolvedContentListFilter } from './filters';
import { useClientFilterCounts } from './use_client_filter_counts';

interface CustomFilterRendererProps {
  query?: Query;
  onChange?: (query: Query) => void;
  filterDefinition: ResolvedContentListFilter;
  'data-test-subj'?: string;
}

export const CustomFilterRenderer = ({
  query,
  onChange,
  filterDefinition,
  'data-test-subj': dataTestSubj,
}: CustomFilterRendererProps) => {
  const countByKey = useClientFilterCounts(filterDefinition.fieldName);

  const idHead = filterDefinition.id.charAt(0).toUpperCase();
  const idTail = filterDefinition.id.slice(1);
  const fallbackDataTestSubj = `contentList${idHead}${idTail}Filter`;

  const options = useMemo(
    (): Array<SelectableFilterOption> =>
      filterDefinition.getOptions().map((option) => ({
        key: option.value,
        label: option.label,
        value: option.label,
        count: countByKey.get(option.value) ?? 0,
      })),
    [countByKey, filterDefinition]
  );

  const renderOption = useCallback(
    (option: SelectableFilterOption, state: { isActive: boolean }) => (
      <StandardFilterOption count={option.count} isActive={state.isActive}>
        <EuiText
          size="s"
          data-test-subj={`${filterDefinition.fieldName}-searchbar-option-${option.key}`}
        >
          {option.label}
        </EuiText>
      </StandardFilterOption>
    ),
    [filterDefinition.fieldName]
  );

  return (
    <SelectableFilterPopover
      fieldName={filterDefinition.fieldName}
      title={filterDefinition.title}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      emptyMessage={filterDefinition.emptyMessage ?? ''}
      noMatchesMessage={filterDefinition.noMatchesMessage ?? ''}
      panelMinWidth={filterDefinition.panelMinWidth}
      data-test-subj={dataTestSubj ?? fallbackDataTestSubj}
    />
  );
};
