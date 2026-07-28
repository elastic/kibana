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
import { EuiText } from '@elastic/eui';

export function NoResultsSuggestionWhenUnmapped() {
  return (
    <EuiText data-test-subj="discoverNoResultsVerifyMapping">
      <FormattedMessage
        id="discover.noResults.suggestion.verifyMappingText"
        defaultMessage="Verify that fields are mapped correctly in the indices you are querying. Values of unmapped fields cannot be searched or sorted."
      />
    </EuiText>
  );
}
