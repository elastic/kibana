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

export interface NoResultsSuggestionWhenFiltersProps {
  onDisableFilters: () => void;
}

export function NoResultsSuggestionWhenFilters({
  onDisableFilters,
}: NoResultsSuggestionWhenFiltersProps) {
  return (
    <EuiText data-test-subj="discoverNoResultsAdjustFilters">
      <FormattedMessage
        id="discover.noResults.suggestion.removeOrDisableFiltersText"
        defaultMessage="Remove or {disableFiltersLink}"
        values={{
          disableFiltersLink: (
            <EuiLink data-test-subj="discoverNoResultsDisableFilters" onClick={onDisableFilters}>
              <FormattedMessage
                id="discover.noResults.suggestion.disableFiltersLinkText"
                defaultMessage="disable filters"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
}
