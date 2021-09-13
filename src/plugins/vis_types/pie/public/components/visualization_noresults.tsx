/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const VisualizationNoResults = () => {
  return (
    <EuiEmptyPrompt
      iconType="visualizeApp"
      iconColor="default"
      data-test-subj="pieVisualizationError"
      body={
        <EuiText size="xs">
          {i18n.translate('visTypePie.noResultsFoundTitle', {
            defaultMessage: 'No results found',
          })}
        </EuiText>
      }
    />
  );
};
