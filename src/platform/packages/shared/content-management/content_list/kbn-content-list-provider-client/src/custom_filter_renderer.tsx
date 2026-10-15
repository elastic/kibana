/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';
import { EuiText, type Query } from '@elastic/eui';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterOption,
} from '@kbn/content-list-toolbar';
import type { ResolvedContentListFilter } from './filters';
import { useClientFilterCounts } from './use_client_filter_counts';

/** A single option surfaced to {@link CustomFilterRendererProps.renderOptionContent}. */
export interface CustomFilterOption {
  /** Stored filter value (the KQL value, also the facet-count key). */
  value: string;
  /** Display label. */
  label: string;
  /** Item count for this value. */
  count: number;
}

export interface CustomFilterRendererProps {
  query?: Query;
  onChange?: (query: Query) => void;
  filterDefinition: ResolvedContentListFilter;
  /**
   * Renders the content of a single option, inside the standard count-badge
   * row. Defaults to the option label as plain text. Supply this to add an
   * icon, color, avatar, etc. — the same extension point the built-in tag and
   * created-by filters use.
   */
  renderOptionContent?: (option: CustomFilterOption, state: { isActive: boolean }) => ReactNode;
  'data-test-subj'?: string;
}

export const CustomFilterRenderer = ({
  query,
  onChange,
  filterDefinition,
  renderOptionContent,
  'data-test-subj': dataTestSubj,
}: CustomFilterRendererProps) => {
  const countByKey = useClientFilterCounts(filterDefinition.fieldName);

  const idHead = filterDefinition.id.charAt(0).toUpperCase();
  const idTail = filterDefinition.id.slice(1);
  const fallbackDataTestSubj = `contentList${idHead}${idTail}Filter`;

  const options = useMemo((): Array<SelectableFilterOption> => {
    const toOption = (value: string, label: string): SelectableFilterOption => ({
      key: value,
      label,
      value: label,
      count: countByKey.get(value) ?? 0,
    });

    const known = filterDefinition.getOptions();
    if (known.length > 0) {
      return known.map((option) => toOption(option.value, option.label));
    }

    // No static option universe: derive options from the values present in the
    // current list (faceted), mirroring the built-in tag and created-by facets.
    return [...countByKey.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => toOption(value, filterDefinition.getLabelForValue(value) ?? value));
  }, [countByKey, filterDefinition]);

  const renderOption = useCallback(
    (option: SelectableFilterOption, state: { isActive: boolean }) => {
      const customOption: CustomFilterOption = {
        value: option.key,
        label: option.label,
        count: option.count ?? 0,
      };
      return (
        <StandardFilterOption count={customOption.count} isActive={state.isActive}>
          {renderOptionContent ? (
            renderOptionContent(customOption, { isActive: state.isActive })
          ) : (
            <EuiText
              size="s"
              data-test-subj={`${filterDefinition.fieldName}-searchbar-option-${customOption.value}`}
            >
              {customOption.label}
            </EuiText>
          )}
        </StandardFilterOption>
      );
    },
    [filterDefinition.fieldName, renderOptionContent]
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
