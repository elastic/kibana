/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiLink,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export interface NoResultsSuggestionWhenFiltersProps {
  onDisableFilters: () => void;
}

export function NoResultsSuggestionWhenFilters({
  onDisableFilters,
}: NoResultsSuggestionWhenFiltersProps) {
  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListTitle data-test-subj="discoverNoResultsAdjustFilters">
        <FormattedMessage
          id="discover.noResults.adjustFilters"
          defaultMessage="Adjust your filters"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <FormattedMessage
          id="discover.noResults.tryRemovingOrDisablingFilters"
          defaultMessage="Try removing or {disablingFiltersLink}."
          values={{
            disablingFiltersLink: (
              <EuiLink data-test-subj="discoverNoResultsDisableFilters" onClick={onDisableFilters}>
                <FormattedMessage
                  id="discover.noResults.temporaryDisablingFiltersLinkText"
                  defaultMessage="temporarily disabling filters"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
