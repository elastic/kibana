/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList, EuiDescriptionListDescription } from '@elastic/eui';

export function NoResultsSuggestionDefault() {
  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListDescription data-test-subj="discoverNoResultsCheckIndices">
        <FormattedMessage
          id="discover.noResults.noDocumentsOrCheckPermissionsDescription"
          defaultMessage="Make sure you have permission to view the indices and that they contain documents."
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
