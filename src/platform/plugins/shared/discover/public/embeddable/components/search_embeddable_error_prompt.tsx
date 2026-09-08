/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { renderSearchError } from '@kbn/search-errors';
import type { InlineEditing } from './saved_search_grid';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

export interface SearchEmbeddableErrorPromptProps {
  error: Error;
  inlineEditing: InlineEditing;
}

export const SearchEmbeddableErrorPrompt = ({
  error,
  inlineEditing,
}: SearchEmbeddableErrorPromptProps) => {
  const renderedError = renderSearchError(error);

  return (
    <SavedSearchEmbeddableBase inlineEditing={inlineEditing} isLoading={false}>
      <EuiFlexGroup
        alignItems="center"
        css={{ height: '100%' }}
        gutterSize="none"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiEmptyPrompt
            body={
              renderedError?.body ?? (
                <p>
                  {error.message ||
                    i18n.translate('discover.embeddable.error.unknownErrorDescription', {
                      defaultMessage: 'An unknown error occurred while running the query.',
                    })}
                </p>
              )
            }
            data-test-subj="discoverEmbeddableErrorCallout"
            icon={<EuiIcon aria-hidden={true} color="danger" size="xxl" type="warning" />}
            title={
              <h2>
                {renderedError?.title ??
                  i18n.translate('discover.embeddable.error.defaultTitle', {
                    defaultMessage: 'Unable to run the query',
                  })}
              </h2>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SavedSearchEmbeddableBase>
  );
};
