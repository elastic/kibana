/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';

export interface NoResultsSuggestionWhenSortedProps {
  onAddExistFiltersForSortedFields: () => void;
}

// TODO: integrate
export function NoResultsSuggestionWhenSorted({
  onAddExistFiltersForSortedFields,
}: NoResultsSuggestionWhenSortedProps) {
  return (
    <EuiText data-test-subj="discoverNoResultsWhenSorted">
      <FormattedMessage
        id="discover.noResults.suggestion.sortOnExistingFieldsText"
        defaultMessage="Sort only on existing values. {addFiltersLink}."
        values={{
          addFiltersLink: (
            <EuiLink
              data-test-subj="discoverNoResultsAddExistFilters"
              onClick={onAddExistFiltersForSortedFields}
            >
              <FormattedMessage
                id="discover.noResults.suggestion.addExistFiltersLinkText"
                defaultMessage="Add filters"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
}
