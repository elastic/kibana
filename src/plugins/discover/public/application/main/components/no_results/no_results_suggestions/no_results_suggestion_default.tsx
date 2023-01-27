/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescriptionList, EuiDescriptionListDescription, EuiCode } from '@elastic/eui';
import { useInternalStateSelector } from '../../../services/discover_internal_state_container';

export function NoResultsSuggestionDefault() {
  const dataViewPattern = useInternalStateSelector((state) => state.dataView?.getIndexPattern?.());

  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListDescription data-test-subj="discoverNoResultsCheckIndices">
        {dataViewPattern ? (
          <FormattedMessage
            id="discover.noResults.noDocumentsOrCheckIndicesAndPermissionsDescription"
            defaultMessage={
              'Make sure the indices matching {pattern} exist, that you have permission to view them and that they contain documents.'
            }
            values={{
              pattern: <EuiCode>{dataViewPattern}</EuiCode>,
            }}
          />
        ) : (
          <FormattedMessage
            id="discover.noResults.noDocumentsOrCheckPermissionsDescription"
            defaultMessage="Make sure you have permission to view the indices and that they contain documents."
          />
        )}
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
