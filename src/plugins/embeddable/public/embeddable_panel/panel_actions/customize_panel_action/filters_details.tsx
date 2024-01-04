/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFormRow,
  EuiSkeletonText,
} from '@elastic/eui';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import {
  type AggregateQuery,
  type Filter,
  getAggregateQueryMode,
  isOfQueryType,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/common';
import { IEmbeddable } from '../../../lib/embeddables';
import { isFilterableEmbeddable } from '../../../lib/filterable_embeddable';

export const filterDetailsActionStrings = {
  getQueryTitle: () =>
    i18n.translate('embeddableApi.panel.filters.queryTitle', {
      defaultMessage: 'Query',
    }),
  getFiltersTitle: () =>
    i18n.translate('embeddableApi.panel.filters.filtersTitle', {
      defaultMessage: 'Filters',
    }),
};

interface FiltersDetailsProps {
  embeddable: IEmbeddable;
  editMode: boolean;
  onEdit: () => void;
}

export function FiltersDetails({ embeddable, editMode, onEdit }: FiltersDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [queryString, setQueryString] = useState<string>('');
  const [queryLanguage, setQueryLanguage] = useState<'sql' | 'esql' | undefined>();
  const [disableEditbutton, setDisableEditButton] = useState(false);
  const dataViews = useMemo(
    () => (embeddable.getOutput() as { indexPatterns?: DataView[] }).indexPatterns || [],
    [embeddable]
  );

  useMount(() => {
    if (!isFilterableEmbeddable(embeddable)) {
      setIsLoading(false);
      return;
    }

    Promise.all([embeddable.getFilters(), embeddable.getQuery()]).then(
      ([embeddableFilters, embeddableQuery]) => {
        setFilters(embeddableFilters);
        if (embeddableQuery) {
          if (isOfQueryType(embeddableQuery)) {
            if (typeof embeddableQuery.query === 'string') {
              setQueryString(embeddableQuery.query);
            } else {
              setQueryString(JSON.stringify(embeddableQuery.query, null, 2));
            }
          } else {
            const language = getAggregateQueryMode(embeddableQuery);
            setQueryLanguage(language);
            setQueryString(embeddableQuery[language as keyof AggregateQuery]);
            setDisableEditButton(true);
          }
        }
        setIsLoading(false);
      }
    );
  });

  return (
    <EuiSkeletonText isLoading={isLoading} lines={3}>
      {queryString !== '' && (
        <EuiFormRow
          label={filterDetailsActionStrings.getQueryTitle()}
          display="rowCompressed"
          labelAppend={
            editMode && !disableEditbutton ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="customizePanelEditQueryButton"
                onClick={onEdit}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.editQueryButtonAriaLabel',
                  {
                    defaultMessage: 'Edit query',
                  }
                )}
              >
                <FormattedMessage
                  id="embeddableApi.customizePanel.flyout.optionsMenuForm.editQueryButtonLabel"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            ) : null
          }
        >
          <EuiCodeBlock
            language={queryLanguage}
            paddingSize="s"
            fontSize="s"
            aria-labelledby={`${filterDetailsActionStrings.getQueryTitle()}: ${queryString}`}
            tabIndex={0} // focus so that keyboard controls will not skip over the code block
          >
            {queryString}
          </EuiCodeBlock>
        </EuiFormRow>
      )}
      {filters.length > 0 && (
        <EuiFormRow
          label={filterDetailsActionStrings.getFiltersTitle()}
          labelAppend={
            editMode && !disableEditbutton ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="customizePanelEditFiltersButton"
                onClick={onEdit}
                aria-label={i18n.translate(
                  'embeddableApi.customizePanel.flyout.optionsMenuForm.editFiltersButtonAriaLabel',
                  {
                    defaultMessage: 'Edit filters',
                  }
                )}
              >
                <FormattedMessage
                  id="embeddableApi.customizePanel.flyout.optionsMenuForm.editFiltersButtonLabel"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            ) : null
          }
        >
          <EuiFlexGroup wrap={true} gutterSize="xs">
            <FilterItems filters={filters} indexPatterns={dataViews} readOnly={true} />
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </EuiSkeletonText>
  );
}
