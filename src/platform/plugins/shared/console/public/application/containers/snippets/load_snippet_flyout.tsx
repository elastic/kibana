/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  EuiSelectable,
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSavedSnippets } from '../../hooks/use_saved_snippets';
import type { SavedSnippet } from '../../../services';

interface Props {
  onClose: () => void;
  onSelect: (snippet: SavedSnippet) => void;
}

export const LoadSnippetFlyout: React.FC<Props> = ({ onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useSavedSnippets(searchTerm);
  const flyoutTitleId = useGeneratedHtmlId();

  const options: EuiSelectableOption[] =
    data?.snippets.map((snippet) => ({
      key: snippet.id,
      label: snippet.title,
      'data-test-subj': `consoleSnippetOption-${snippet.id}`,
      prepend: (
        <span
          style={{
            fontSize: '1.2em',
            marginRight: '8px',
          }}
        >
          📄
        </span>
      ),
      append: snippet.description ? (
        <EuiText size="xs" color="subdued">
          {snippet.description.length > 50
            ? `${snippet.description.substring(0, 50)}...`
            : snippet.description}
        </EuiText>
      ) : undefined,
    })) || [];

  const handleSelect = (newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((option) => option.checked === 'on');
    if (selected && selected.key) {
      const snippet = data?.snippets.find((s) => s.id === selected.key);
      if (snippet) {
        onSelect(snippet);
      }
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="consoleLoadSnippetFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            <FormattedMessage
              id="console.snippets.loadSnippetFlyout.title"
              defaultMessage="Load snippet"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFieldSearch
          placeholder={i18n.translate('console.snippets.loadSnippetFlyout.searchPlaceholder', {
            defaultMessage: 'Search snippets',
          })}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          isClearable
          fullWidth
          data-test-subj="consoleSnippetSearchInput"
        />
        <EuiSpacer size="m" />

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <EuiLoadingSpinner size="xl" />
          </div>
        ) : error ? (
          <EuiCallOut
            title={i18n.translate('console.snippets.loadSnippetFlyout.errorTitle', {
              defaultMessage: 'Error loading snippets',
            })}
            color="danger"
            iconType="error"
          >
            <p>
              {error instanceof Error
                ? error.message
                : i18n.translate('console.snippets.loadSnippetFlyout.genericError', {
                    defaultMessage: 'An unexpected error occurred',
                  })}
            </p>
          </EuiCallOut>
        ) : options.length === 0 ? (
          <EuiCallOut
            title={i18n.translate('console.snippets.loadSnippetFlyout.noSnippetsTitle', {
              defaultMessage: 'No snippets found',
            })}
            iconType="iInCircle"
          >
            <p>
              {searchTerm ? (
                <FormattedMessage
                  id="console.snippets.loadSnippetFlyout.noSnippetsMatchingSearch"
                  defaultMessage="No snippets match your search. Try a different search term."
                />
              ) : (
                <FormattedMessage
                  id="console.snippets.loadSnippetFlyout.noSnippetsSaved"
                  defaultMessage="You haven't saved any snippets yet. Save your first snippet from the editor."
                />
              )}
            </p>
          </EuiCallOut>
        ) : (
          <EuiSelectable
            options={options}
            onChange={handleSelect}
            singleSelection="always"
            searchable={false}
            listProps={{
              bordered: true,
              rowHeight: 50,
            }}
          >
            {(list) => list}
          </EuiSelectable>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
