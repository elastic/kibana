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
import { EuiText, EuiCode } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';

export interface NoResultsSuggestionDefaultProps {
  dataView: DataView;
}

export const NoResultsSuggestionDefault: React.FC<NoResultsSuggestionDefaultProps> = ({
  dataView,
}) => {
  const dataViewName = dataView?.getName();
  const dataViewPattern = dataView?.getIndexPattern();

  return (
    <EuiText data-test-subj="discoverNoResultsCheckIndices">
      {dataViewName && dataViewPattern ? (
        <FormattedMessage
          id="discover.noResults.noDocumentsOrCheckIndicesAndPermissionsDescription"
          defaultMessage="Make sure that the data view {dataViewName} with index pattern {dataViewPattern} has matching indices and documents and that you have permission to view them."
          values={{
            dataViewName: <strong>{dataViewName}</strong>,
            dataViewPattern: <EuiCode>{dataViewPattern}</EuiCode>,
          }}
        />
      ) : (
        <FormattedMessage
          id="discover.noResults.noDocumentsOrCheckPermissionsDescription"
          defaultMessage="Make sure that you have permission to view the indices and that they contain documents."
        />
      )}
    </EuiText>
  );
};
