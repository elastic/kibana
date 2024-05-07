/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiButtonEmpty, EuiCodeBlock, EuiFlexGroup, EuiFormRow } from '@elastic/eui';
import { getAggregateQueryMode, isOfQueryType, type AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { hasEditCapabilities } from '@kbn/presentation-publishing';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { editPanelAction } from '../panel_actions';
import { CustomizePanelActionApi } from './customize_panel_action';

export const filterDetailsActionStrings = {
  getQueryTitle: () =>
    i18n.translate('presentationPanel.filters.queryTitle', {
      defaultMessage: 'Query',
    }),
  getFiltersTitle: () =>
    i18n.translate('presentationPanel.filters.filtersTitle', {
      defaultMessage: 'Filters',
    }),
};

interface FiltersDetailsProps {
  editMode: boolean;
  api: CustomizePanelActionApi;
}

export function FiltersDetails({ editMode, api }: FiltersDetailsProps) {
  const [queryString, setQueryString] = useState<string>('');
  const [queryLanguage, setQueryLanguage] = useState<'sql' | 'esql' | undefined>();
  const dataViews = api.dataViews?.value ?? [];

  const filters = useMemo(() => api.filters$?.value ?? [], [api]);

  const [incompatibleQueryLanguage, setIncompatibleQueryLanguage] = useState(false);
  const showEditButton = hasEditCapabilities(api) && editMode && !incompatibleQueryLanguage;

  useMount(() => {
    const localQuery = api.query$?.value;
    if (localQuery) {
      if (isOfQueryType(localQuery)) {
        if (typeof localQuery.query === 'string') {
          setQueryString(localQuery.query);
        } else {
          setQueryString(JSON.stringify(localQuery.query, null, 2));
        }
      } else {
        const language = getAggregateQueryMode(localQuery);
        setQueryLanguage(language);
        setQueryString(localQuery[language as keyof AggregateQuery]);
        setIncompatibleQueryLanguage(true);
      }
    }
  });

  return (
    <>
      {queryString !== '' && (
        <EuiFormRow
          data-test-subj="panelCustomQueryRow"
          label={filterDetailsActionStrings.getQueryTitle()}
          display="rowCompressed"
          labelAppend={
            showEditButton ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="customizePanelEditQueryButton"
                onClick={() => editPanelAction.execute({ embeddable: api })}
                aria-label={i18n.translate(
                  'presentationPanel.action.customizePanel.flyout.optionsMenuForm.editQueryButtonAriaLabel',
                  {
                    defaultMessage: 'Edit query',
                  }
                )}
              >
                <FormattedMessage
                  id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.editQueryButtonLabel"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            ) : null
          }
        >
          <EuiCodeBlock
            data-test-subj="customPanelQuery"
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
          data-test-subj="panelCustomFiltersRow"
          label={filterDetailsActionStrings.getFiltersTitle()}
          labelAppend={
            showEditButton ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="customizePanelEditFiltersButton"
                onClick={() => editPanelAction.execute({ embeddable: api })}
                aria-label={i18n.translate(
                  'presentationPanel.action.customizePanel.flyout.optionsMenuForm.editFiltersButtonAriaLabel',
                  {
                    defaultMessage: 'Edit filters',
                  }
                )}
              >
                <FormattedMessage
                  id="presentationPanel.action.customizePanel.flyout.optionsMenuForm.editFiltersButtonLabel"
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
    </>
  );
}
