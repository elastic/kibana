/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo } from 'react';
import { EuiText, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FieldDefinition } from '@kbn/content-list-provider';
import {
  SelectableFilterPopover,
  StandardFilterOption,
  filter,
  type SelectableFilterOption,
} from '@kbn/content-list-toolbar';
import {
  RESOURCE_TYPES,
  resolveResourceKind,
  type DataManagementResource,
} from './sample_resources';

export const LoadedResourcesContext = createContext<readonly DataManagementResource[]>([]);

export const TYPE_FILTER_FIELD = 'type';

const typeFilterTitle = i18n.translate('management.dataManagementOverview.filter.type', {
  defaultMessage: 'Type',
});

const emptyTypesMessage = i18n.translate('management.dataManagementOverview.filter.type.empty', {
  defaultMessage: 'There are no types',
});

const noTypeMatchesMessage = i18n.translate(
  'management.dataManagementOverview.filter.type.noMatches',
  {
    defaultMessage: 'No types match your search',
  }
);

/** Lets the search bar treat `type:` as a filter and show type labels in the query. */
export const typeFieldDefinition: FieldDefinition = {
  fieldName: TYPE_FILTER_FIELD,
  resolveIdToDisplay: (id) => RESOURCE_TYPES.find((type) => type.kind === id)?.label ?? id,
  resolveDisplayToId: (displayValue) => resolveResourceKind(displayValue),
};

interface TypeFilterControlProps {
  query?: Query;
  onChange?: (query: Query) => void;
}

const TypeFilterControl = ({ query, onChange }: TypeFilterControlProps) => {
  const resources = useContext(LoadedResourcesContext);
  const options = useMemo((): Array<SelectableFilterOption> => {
    const counts = new Map<string, number>();
    for (const resource of resources) {
      counts.set(resource.kind, (counts.get(resource.kind) ?? 0) + 1);
    }

    return [...RESOURCE_TYPES]
      .filter((type) => (counts.get(type.kind) ?? 0) > 0)
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((type) => ({
        key: type.kind,
        label: type.label,
        value: type.label,
        count: counts.get(type.kind) ?? 0,
      }));
  }, [resources]);

  return (
    <SelectableFilterPopover
      data-test-subj="dataManagementOverviewTypeFilter"
      emptyMessage={emptyTypesMessage}
      fieldName={TYPE_FILTER_FIELD}
      noMatchesMessage={noTypeMatchesMessage}
      onChange={onChange}
      options={options}
      query={query}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption count={option.count} isActive={isActive}>
          <EuiText size="s" data-test-subj={`dataManagementOverviewTypeOption-${option.key}`}>
            {option.label}
          </EuiText>
        </StandardFilterOption>
      )}
      title={typeFilterTitle}
    />
  );
};

/** Filter button that opens the full list of resource types. */
export const TypeFilter = filter.createComponent<Record<never, never>>({
  resolve: () => ({
    type: 'custom_component',
    component: TypeFilterControl,
  }),
});
