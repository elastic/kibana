/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface SavedSearchComponentErrorContentProps {
  error?: Error;
}

export const SavedSearchComponentErrorContent: React.FC<SavedSearchComponentErrorContentProps> = ({
  error,
}) => {
  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={<h2>{SavedSearchComponentErrorTitle}</h2>}
      body={
        <EuiCodeBlock className="eui-textLeft" whiteSpace="pre">
          <p>{error?.stack ?? error?.toString() ?? unknownErrorDescription}</p>
        </EuiCodeBlock>
      }
      layout="vertical"
    />
  );
};

const SavedSearchComponentErrorTitle = i18n.translate('savedSearchComponent.errorTitle', {
  defaultMessage: 'Error',
});

const unknownErrorDescription = i18n.translate('savedSearchComponent.unknownErrorDescription', {
  defaultMessage: 'An unspecified error occurred.',
});
